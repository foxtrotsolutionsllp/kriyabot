<?php

namespace App\Policies;

use App\Models\User;

abstract class WorkspaceResourcePolicy
{
    protected function sameWorkspace(User $user, object $resource): bool
    {
        return (int) ($resource->workspace_id ?? 0) === (int) $user->workspace_id;
    }

    protected function can(User $user, object $resource, string $permission): bool
    {
        return (int) ($resource->workspace_id ?? 0) === (int) $user->workspace_id
            && ($user->hasPermission($permission) || $user->hasRole('workspace_owner'));
    }
}
