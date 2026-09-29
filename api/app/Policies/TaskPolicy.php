<?php

namespace App\Policies;

use App\Models\Task;
use App\Models\TaskAttachment;
use App\Models\User;

class TaskPolicy extends WorkspaceResourcePolicy
{
    public function view(User $user, Task $task): bool
    {
        if (! $this->sameWorkspace($user, $task)) return false;
        if ($user->hasRole('workspace_owner') || (int) $task->created_by === (int) $user->id || $task->assignees()->whereKey($user->id)->exists()) return true;
        return $task->project && app(ProjectPolicy::class)->view($user, $task->project);
    }

    public function create(User $user): bool
    {
        return $user->hasRole('workspace_owner') || $user->hasRole('workspace_member') || $user->hasPermission('tasks.create');
    }

    public function update(User $user, Task $task): bool
    {
        if (! $this->sameWorkspace($user, $task)) return false;
        if ($user->hasRole('workspace_owner') || (int) $task->created_by === (int) $user->id) return true;
        return $task->project && app(ProjectPolicy::class)->update($user, $task->project);
    }

    public function assign(User $user, Task $task): bool { return $this->update($user, $task); }

    public function addAttachment(User $user, Task $task): bool
    {
        return $this->sameWorkspace($user, $task)
            && ($this->update($user, $task) || $task->assignees()->whereKey($user->id)->exists());
    }

    public function deleteAttachment(User $user, Task $task, TaskAttachment $attachment): bool
    {
        return $this->sameWorkspace($user, $task)
            && (int) $attachment->task_id === (int) $task->id
            && ((int) $attachment->uploaded_by === (int) $user->id || $this->update($user, $task));
    }

    public function changeStatus(User $user, Task $task): bool
    {
        if (! $this->sameWorkspace($user, $task)) return false;
        return $user->hasRole('workspace_owner')
            || (int) $task->created_by === (int) $user->id
            || $task->assignees()->whereKey($user->id)->exists()
            || ($task->project && app(ProjectPolicy::class)->update($user, $task->project));
    }

    public function delete(User $user, Task $task): bool { return $this->update($user, $task); }
}
