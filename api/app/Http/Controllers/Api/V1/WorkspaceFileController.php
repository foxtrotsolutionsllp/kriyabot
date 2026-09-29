<?php
namespace App\Http\Controllers\Api\V1;
use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\WorkspaceFile;
use App\Services\AuditLogger;
use App\Services\PrivateUploadStorage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\HeaderUtils;

class WorkspaceFileController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $files = WorkspaceFile::where('workspace_id', $user->workspace_id)->with('uploader:id,name')->latest()->limit(200)->get()->map(fn ($file) => ['id' => $file->id, 'kind' => 'workspace', 'name' => $file->original_name, 'mime_type' => $file->mime_type, 'size' => $file->size, 'uploaded_at' => $file->created_at, 'uploader' => $file->uploader?->name, 'can_delete' => $file->uploaded_by === $user->id || $user->hasRole('workspace_owner'), 'url' => '/api/backend/files/'.$file->id.'/preview']);
        $tasks = Task::where('workspace_id', $user->workspace_id)->with(['attachments' => fn ($q) => $q->latest()->limit(200), 'attachments.uploader:id,name', 'project:id,name']);
        if (! $user->hasRole('workspace_owner')) $tasks->where(fn ($q) => $q->where('created_by', $user->id)->orWhereHas('assignees', fn ($a) => $a->where('users.id', $user->id))->orWhereHas('project.members', fn ($m) => $m->where('users.id', $user->id)));
        $taskFiles = $tasks->get()->flatMap(fn ($task) => $task->attachments->map(fn ($file) => ['id' => $file->id, 'task_id' => $task->id, 'kind' => 'task', 'name' => $file->original_name, 'mime_type' => $file->mime_type, 'size' => $file->size, 'uploaded_at' => $file->created_at, 'uploader' => $file->uploader?->name, 'can_delete' => $user->can('deleteAttachment', [$task, $file]), 'url' => '/api/backend/tasks/'.$task->id.'/attachments/'.$file->id.'/preview', 'context' => $task->title]));
        return response()->json($files->concat($taskFiles)->sortByDesc('uploaded_at')->values());
    }

    public function store(Request $request, PrivateUploadStorage $storage, AuditLogger $audit)
    {
        $data = $request->validate(['file' => ['required', 'file']]);
        $file = $data['file']; $path = $storage->store($file, (int) $request->user()->workspace_id, 'library');
        $name = basename(str_replace('\\', '/', (string) $file->getClientOriginalName()));
        try {
            $record = WorkspaceFile::create(['workspace_id' => $request->user()->workspace_id, 'uploaded_by' => $request->user()->id, 'disk' => $storage->diskName(), 'path' => $path, 'original_name' => Str::limit(trim((string) preg_replace('/[\x00-\x1F\x7F]/u', '', $name)) ?: 'file', 255, ''), 'mime_type' => (string) $file->getMimeType(), 'size' => (int) $file->getSize()]);
        } catch (\Throwable $exception) { $storage->delete($path); throw $exception; }
        $audit->record($request, 'workspace.file_uploaded', $record, ['name' => $record->original_name, 'size' => $record->size]);
        return response()->json(['id' => $record->id, 'kind' => 'workspace', 'name' => $record->original_name, 'mime_type' => $record->mime_type, 'size' => $record->size, 'uploaded_at' => $record->created_at, 'can_delete' => true, 'url' => '/api/backend/files/'.$record->id.'/preview'], 201);
    }

    public function preview(Request $request, WorkspaceFile $file)
    {
        abort_unless((int) $file->workspace_id === (int) $request->user()->workspace_id, 404);
        $stream = Storage::disk($file->disk)->readStream($file->path); abort_unless(is_resource($stream), 404);
        $inline = ! $request->boolean('download') && in_array($file->mime_type, ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif'], true);
        $disposition = HeaderUtils::makeDisposition($inline ? 'inline' : 'attachment', $file->original_name, Str::ascii($file->original_name) ?: 'file');
        return response()->stream(function () use ($stream) { fpassthru($stream); fclose($stream); }, 200, ['Content-Type' => $file->mime_type, 'Content-Length' => (string) $file->size, 'Content-Disposition' => $disposition, 'X-Content-Type-Options' => 'nosniff', 'Content-Security-Policy' => "sandbox; default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'", 'Cache-Control' => 'private, no-store']);
    }

    public function destroy(Request $request, WorkspaceFile $file, PrivateUploadStorage $storage, AuditLogger $audit)
    {
        abort_unless((int) $file->workspace_id === (int) $request->user()->workspace_id, 404);
        abort_unless((int) $file->uploaded_by === (int) $request->user()->id || $request->user()->hasRole('workspace_owner'), 403);
        if (! $storage->delete($file->path)) throw new \RuntimeException('Could not remove the private file.');
        DB::transaction(fn () => $file->delete());
        $audit->record($request, 'workspace.file_deleted', $file, ['name' => $file->original_name]);
        return response()->noContent();
    }
}
