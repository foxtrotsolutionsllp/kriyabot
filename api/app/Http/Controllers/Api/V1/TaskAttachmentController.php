<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\TaskAttachment;
use App\Services\AuditLogger;
use App\Services\PrivateUploadStorage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\HeaderUtils;

class TaskAttachmentController extends Controller
{
    public function index(Request $request, Task $task)
    {
        $this->authorize('view', $task);
        return response()->json($task->attachments()->with('uploader:id,name')->orderBy('created_at')->get());
    }

    public function store(Request $request, Task $task, PrivateUploadStorage $storage, AuditLogger $audit)
    {
        $this->authorize('addAttachment', $task);
        $data = $request->validate(['file' => ['required', 'file']]);
        $file = $data['file'];
        $path = $storage->store($file, (int) $request->user()->workspace_id, 'tasks/'.$task->id);
        $originalName = basename(str_replace('\\', '/', (string) $file->getClientOriginalName()));
        $originalName = trim((string) preg_replace('/[\x00-\x1F\x7F]/u', '', $originalName));
        if ($originalName === '') $originalName = 'attachment';

        try {
            $attachment = DB::transaction(function () use ($request, $task, $storage, $path, $originalName, $file): TaskAttachment {
                return $task->attachments()->create([
                    'workspace_id' => $request->user()->workspace_id,
                    'uploaded_by' => $request->user()->id,
                    'disk' => $storage->diskName(),
                    'path' => $path,
                    'original_name' => Str::limit($originalName, 255, ''),
                    'mime_type' => (string) $file->getMimeType(),
                    'size' => (int) $file->getSize(),
                ]);
            });
        } catch (\Throwable $exception) {
            $storage->delete($path);
            throw $exception;
        }

        $audit->record($request, 'task.attachment_added', $attachment, ['task_id' => $task->id, 'name' => $attachment->original_name, 'size' => $attachment->size]);
        return response()->json($attachment->load('uploader:id,name'), 201);
    }

    public function preview(Request $request, Task $task, TaskAttachment $attachment)
    {
        $this->authorize('view', $task);
        abort_unless((int) $attachment->task_id === (int) $task->id && (int) $attachment->workspace_id === (int) $request->user()->workspace_id, 404);

        $stream = Storage::disk($attachment->disk)->readStream($attachment->path);
        abort_unless(is_resource($stream), 404, 'Attachment not found.');

        $inline = ! $request->boolean('download') && in_array($attachment->mime_type, ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif'], true);
        $safeName = Str::ascii($attachment->original_name) ?: 'attachment';
        $disposition = HeaderUtils::makeDisposition($inline ? 'inline' : 'attachment', $attachment->original_name, $safeName);
        return response()->stream(function () use ($stream): void {
            fpassthru($stream);
            fclose($stream);
        }, 200, [
            'Content-Type' => $attachment->mime_type,
            'Content-Length' => (string) $attachment->size,
            'Content-Disposition' => $disposition,
            'X-Content-Type-Options' => 'nosniff',
            'Content-Security-Policy' => "sandbox; default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'",
            'Cache-Control' => 'private, no-store',
        ]);
    }

    public function destroy(Request $request, Task $task, TaskAttachment $attachment, PrivateUploadStorage $storage, AuditLogger $audit)
    {
        $this->authorize('deleteAttachment', [$task, $attachment]);
        abort_unless((int) $attachment->task_id === (int) $task->id && (int) $attachment->workspace_id === (int) $request->user()->workspace_id, 404);
        $path = $attachment->path;
        $disk = $attachment->disk;
        $fileDisk = Storage::disk($disk);
        if ($fileDisk->exists($path) && ! $fileDisk->delete($path)) throw new \RuntimeException('Could not remove the private task attachment.');
        DB::transaction(fn () => $attachment->delete());
        $audit->record($request, 'task.attachment_deleted', $attachment, ['task_id' => $task->id, 'name' => $attachment->original_name]);
        return response()->noContent();
    }
}
