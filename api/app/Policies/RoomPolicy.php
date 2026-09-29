<?php

namespace App\Policies;

class RoomPolicy extends WorkspaceResourcePolicy
{
    public function view(\App\Models\User $user, object $room): bool { return $this->can($user, $room, 'rooms.view'); }
    public function create(\App\Models\User $user): bool { return $user->hasPermission('rooms.create') || $user->hasRole('workspace_owner'); }
    public function moderate(\App\Models\User $user, object $room): bool { return $this->can($user, $room, 'rooms.moderate'); }
    public function delete(\App\Models\User $user, object $room): bool { return $this->can($user, $room, 'rooms.delete'); }
}
