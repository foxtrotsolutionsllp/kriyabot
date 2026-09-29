<?php

namespace App\Policies;

use App\Models\Project;
use App\Models\User;

class ProjectPolicy extends WorkspaceResourcePolicy
{
    public function view(User $user, Project $project): bool
    {
        if (! $this->sameWorkspace($user, $project)) return false;
        return $user->hasRole('workspace_owner') || $project->members()->whereKey($user->id)->exists();
    }

    public function create(User $user): bool
    {
        return $user->hasRole('workspace_owner') || $user->hasRole('workspace_member') || $user->hasPermission('projects.create');
    }

    public function update(User $user, Project $project): bool
    {
        return $this->sameWorkspace($user, $project) && (
            $user->hasRole('workspace_owner')
            || (int) $project->created_by === (int) $user->id
            || $project->members()->whereKey($user->id)->wherePivotIn('role', ['owner', 'editor'])->exists()
        );
    }

    public function delete(User $user, Project $project): bool { return $this->update($user, $project); }
    public function createTask(User $user, Project $project): bool { return $this->update($user, $project); }
}
