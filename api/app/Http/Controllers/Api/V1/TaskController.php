<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Task;
use App\Models\TaskflowReminder;
use App\Services\AuditLogger;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class TaskController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Task::where('workspace_id', $user->workspace_id)->with(['creator:id,name', 'project:id,name', 'assignees:id,name', 'attachments:id,task_id,uploaded_by,original_name,mime_type,size,created_at', 'attachments.uploader:id,name'])->orderBy('sort_order')->orderBy('due_at');
        if ($request->filled('project_id')) {
            $project = Project::where('workspace_id', $user->workspace_id)->findOrFail($request->integer('project_id'));
            $this->authorize('view', $project);
            $query->where('project_id', $project->id);
        } elseif (! $user->hasRole('workspace_owner')) {
            $query->where(function (Builder $visible) use ($user): void {
                $visible->where('created_by', $user->id)
                    ->orWhereHas('assignees', fn (Builder $assignees) => $assignees->where('users.id', $user->id))
                    ->orWhereHas('project.members', fn (Builder $members) => $members->where('users.id', $user->id));
            });
        }
        if ($request->filled('status')) {
            $request->validate(['status' => [Rule::in(['open', 'in_progress', 'blocked', 'done', 'cancelled'])]]);
            $query->where('status', $request->string('status')->toString());
        }
        $tasks = $query->paginate(50);
        $tasks->getCollection()->each(function (Task $task) use ($user): void {
            $task->setAttribute('can_manage', $user->can('update', $task));
            $task->setAttribute('can_upload', $user->can('addAttachment', $task));
            $task->attachments->each(fn ($attachment) => $attachment->setAttribute('can_delete', $user->can('deleteAttachment', [$task, $attachment])));
        });
        return response()->json($tasks);
    }

    public function store(Request $request, AuditLogger $audit)
    {
        $this->authorize('create', Task::class);
        $data = $this->validatedTask($request, creating: true);
        $project = null;
        if (! empty($data['project_id'])) {
            $project = Project::where('workspace_id', $request->user()->workspace_id)->findOrFail($data['project_id']);
            $this->authorize('createTask', $project);
        }

        $task = DB::transaction(function () use ($request, $data, $project): Task {
            $task = Task::create([
                ...collect($data)->except(['assignee_ids', 'reminder_minutes'])->all(),
                'workspace_id' => $request->user()->workspace_id,
                'created_by' => $request->user()->id,
                'status' => 'open',
            ]);
            if (array_key_exists('assignee_ids', $data)) $this->syncAssignees($task, $data['assignee_ids'], $request);
            if ($project && ! empty($data['assignee_ids'])) $this->addProjectMembers($project, $data['assignee_ids'], $request);
            if (array_key_exists('reminder_minutes', $data) && $data['reminder_minutes'] !== null && $task->due_at) {
                $userIds = collect([$task->created_by])->merge($task->assignees()->pluck('users.id'))->unique();
                foreach ($userIds as $userId) {
                    $reminder = new TaskflowReminder(['workspace_id' => $task->workspace_id, 'user_id' => $userId, 'remind_at' => $task->due_at->copy()->subMinutes($data['reminder_minutes']), 'status' => 'pending']);
                    $reminder->remindable()->associate($task);
                    $reminder->save();
                }
            }
            return $task;
        });
        $audit->record($request, 'task.created', $task, ['project_id' => $task->project_id, 'assignee_ids' => $data['assignee_ids'] ?? []]);
        return response()->json($this->withRelations($task), 201);
    }

    public function show(Request $request, Task $task)
    {
        $this->authorize('view', $task);
        return response()->json($this->withRelations($task));
    }

    public function update(Request $request, Task $task, AuditLogger $audit)
    {
        $this->authorize('update', $task);
        $data = $this->validatedTask($request, task: $task);
        $assigneeIds = $data['assignee_ids'] ?? null;
        $destinationProject = null;
        if (array_key_exists('project_id', $data) && $data['project_id'] !== null) {
            $destinationProject = Project::where('workspace_id', $request->user()->workspace_id)->findOrFail($data['project_id']);
            $this->authorize('createTask', $destinationProject);
        }
        $fields = collect($data)->except('assignee_ids')->all();
        DB::transaction(function () use ($request, $task, $fields, $assigneeIds, $destinationProject): void {
            if (array_key_exists('status', $fields)) $fields['completed_at'] = $fields['status'] === 'done' ? now() : null;
            $task->fill($fields)->save();
            if ($assigneeIds !== null) {
                $this->authorize('assign', $task);
                $this->syncAssignees($task, $assigneeIds, $request);
            }
            if ($destinationProject) $this->addProjectMembers($destinationProject, $assigneeIds ?? $task->assignees()->pluck('users.id')->all(), $request);
        });
        $audit->record($request, 'task.updated', $task, ['fields' => array_keys($data), 'assignee_ids' => $assigneeIds]);
        return response()->json($this->withRelations($task->fresh()));
    }

    public function changeStatus(Request $request, Task $task, AuditLogger $audit)
    {
        $this->authorize('changeStatus', $task);
        $data = $request->validate(['status' => ['required', Rule::in(['open', 'in_progress', 'blocked', 'done', 'cancelled'])]]);
        $task->forceFill(['status' => $data['status'], 'completed_at' => $data['status'] === 'done' ? now() : null])->save();
        $audit->record($request, 'task.status_changed', $task, $data);
        return response()->json($this->withRelations($task->fresh()));
    }

    public function destroy(Request $request, Task $task, AuditLogger $audit)
    {
        $this->authorize('delete', $task);
        $task->forceFill(['deleted_with_project_id' => null])->save();
        $audit->record($request, 'task.trashed', $task, ['retention_days' => config('taskflow.trash.retention_days', 10)]);
        $task->delete();
        return response()->noContent();
    }

    private function validatedTask(Request $request, bool $creating = false, ?Task $task = null): array
    {
        $user = $request->user();
        $existingAssigneeIds = $task?->assignees()->pluck('users.id')->all() ?? [];
        $fields = [
            'title' => [$creating ? 'required' : 'sometimes', 'string', 'max:240'],
            'description' => ['sometimes', 'nullable', 'string', 'max:20000'],
            'priority' => ['sometimes', Rule::in(['low', 'normal', 'high', 'urgent'])],
            'start_at' => ['sometimes', 'nullable', 'date'],
            'due_at' => ['sometimes', 'nullable', 'date'],
            'reminder_minutes' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:10080'],
            'assignee_ids' => ['sometimes', 'array', 'max:50'],
            'assignee_ids.*' => [
                'integer', 'distinct',
                Rule::exists('users', 'id')->where(fn ($query) => $query->where('workspace_id', $user->workspace_id)->where('status', 'active')->where('approval_status', 'approved')->where(fn ($visible) => $visible->where('profile_visibility', '!=', 'private')->orWhere('id', $user->id)->when($existingAssigneeIds !== [], fn ($allowed) => $allowed->orWhereIn('id', $existingAssigneeIds)))),
            ],
        ];
        if (! $creating) $fields['status'] = ['sometimes', Rule::in(['open', 'in_progress', 'blocked', 'done', 'cancelled'])];
        if ($creating) {
            $fields['project_id'] = ['nullable', 'integer', Rule::exists('projects', 'id')->where(fn ($query) => $query->where('workspace_id', $user->workspace_id))];
        } else {
            $fields['project_id'] = ['sometimes', 'nullable', 'integer', Rule::exists('projects', 'id')->where(fn ($query) => $query->where('workspace_id', $user->workspace_id))];
        }
        return $request->validate($fields);
    }

    private function syncAssignees(Task $task, array $ids, Request $request): void
    {
        $task->assignees()->syncWithPivotValues($ids, [
            'workspace_id' => $request->user()->workspace_id,
            'assigned_by' => $request->user()->id,
            'assigned_at' => now(),
        ]);
    }

    private function addProjectMembers(Project $project, array $ids, Request $request): void
    {
        foreach ($ids as $id) {
            $project->members()->syncWithoutDetaching([$id => [
                'workspace_id' => $request->user()->workspace_id,
                'role' => 'member',
                'added_by' => $request->user()->id,
            ]]);
        }
    }

    private function withRelations(Task $task): Task
    {
        return $task->load(['creator:id,name', 'project:id,name', 'assignees:id,name', 'attachments:id,task_id,uploaded_by,original_name,mime_type,size,created_at', 'attachments.uploader:id,name']);
    }
}
