<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Task;
use App\Services\AuditLogger;
use App\Services\TrashRetentionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TrashController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $days = (int) config('taskflow.trash.retention_days', 10);
        $projects = Project::onlyTrashed()->where('workspace_id', $user->workspace_id)->with('creator:id,name')->latest('deleted_at')->get()
            ->filter(fn (Project $project) => $user->can('delete', $project))
            ->map(fn (Project $project) => [...$project->toArray(), 'kind' => 'project', 'trashed_at' => $project->deleted_at, 'expires_at' => $project->deleted_at?->copy()->addDays($days)]);
        $tasks = Task::onlyTrashed()->where('workspace_id', $user->workspace_id)->whereNull('deleted_with_project_id')->with(['creator:id,name', 'project:id,name'])->latest('deleted_at')->get()
            ->filter(fn (Task $task) => $user->can('delete', $task))
            ->map(fn (Task $task) => [...$task->toArray(), 'kind' => 'task', 'trashed_at' => $task->deleted_at, 'expires_at' => $task->deleted_at?->copy()->addDays($days)]);
        return response()->json(['projects' => $projects->values(), 'tasks' => $tasks->values(), 'retention_days' => $days]);
    }

    public function restoreProject(Request $request, int $id, AuditLogger $audit)
    {
        $project = Project::onlyTrashed()->where('workspace_id', $request->user()->workspace_id)->findOrFail($id);
        $this->authorize('delete', $project);
        $this->ensureRestorable($project->deleted_at);
        DB::transaction(function () use ($project, $request, $audit): void {
            $project->restore();
            Task::withTrashed()->where('deleted_with_project_id', $project->id)->update(['deleted_at' => null, 'deleted_with_project_id' => null, 'updated_at' => now()]);
            $audit->record($request, 'project.restored', $project);
        });
        return response()->json(['message' => 'Project restored.']);
    }

    public function restoreTask(Request $request, int $id, AuditLogger $audit)
    {
        $task = Task::onlyTrashed()->where('workspace_id', $request->user()->workspace_id)->whereNull('deleted_with_project_id')->findOrFail($id);
        $this->authorize('delete', $task);
        $this->ensureRestorable($task->deleted_at);
        $task->restore();
        $task->forceFill(['deleted_with_project_id' => null])->save();
        $audit->record($request, 'task.restored', $task);
        return response()->json(['message' => 'Task restored.']);
    }

    public function permanentlyDeleteProject(Request $request, int $id, TrashRetentionService $trash, AuditLogger $audit)
    {
        $project = Project::onlyTrashed()->where('workspace_id', $request->user()->workspace_id)->findOrFail($id);
        $this->authorize('delete', $project);
        $audit->record($request, 'project.permanently_deleted', $project);
        $trash->permanentlyDeleteProject($project);
        return response()->noContent();
    }

    public function permanentlyDeleteTask(Request $request, int $id, TrashRetentionService $trash, AuditLogger $audit)
    {
        $task = Task::onlyTrashed()->where('workspace_id', $request->user()->workspace_id)->whereNull('deleted_with_project_id')->findOrFail($id);
        $this->authorize('delete', $task);
        $audit->record($request, 'task.permanently_deleted', $task);
        $trash->permanentlyDeleteTask($task);
        return response()->noContent();
    }

    private function ensureRestorable(?\Illuminate\Support\Carbon $deletedAt): void
    {
        abort_if(! $deletedAt || $deletedAt->lt(now()->subDays((int) config('taskflow.trash.retention_days', 10))), 410, 'The restore period has expired.');
    }
}
