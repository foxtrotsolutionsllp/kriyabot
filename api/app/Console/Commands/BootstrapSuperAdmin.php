<?php

namespace App\Console\Commands;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class BootstrapSuperAdmin extends Command
{
    protected $signature = 'taskflow:bootstrap-admin {email : Existing verified account email to promote}';
    protected $description = 'One-time bootstrap for the first TaskFlow Super Admin';

    public function handle(): int
    {
        if (\App\Models\UserRole::whereHas('role', fn ($query) => $query->where('name', 'super_admin'))->exists()) {
            $this->error('A Super Admin already exists.');
            return self::FAILURE;
        }
        $user = User::where('email', $this->argument('email'))->first();
        if (! $user || ! $user->hasVerifiedEmail()) {
            $this->error('Use an existing account with a verified email address.');
            return self::FAILURE;
        }

        DB::transaction(function () use ($user): void {
            $role = Role::firstOrCreate(['workspace_id' => null, 'name' => 'super_admin'], ['description' => 'Platform-wide administrator', 'is_system' => true]);
            $names = ['users.approve', 'users.suspend', 'roles.manage', 'workspace.security', 'audit.view', 'tasks.view', 'tasks.create', 'tasks.update', 'tasks.delete', 'projects.view', 'projects.create', 'projects.update', 'projects.delete', 'rooms.view', 'rooms.create', 'rooms.moderate', 'rooms.delete'];
            foreach ($names as $name) {
                $permission = Permission::firstOrCreate(['name' => $name], ['description' => 'TaskFlow '.$name.' permission']);
                $role->permissions()->syncWithoutDetaching([$permission->id]);
            }
            $user->forceFill(['status' => 'active', 'approval_status' => 'approved', 'approved_at' => now(), 'approved_by' => $user->id])->save();
            UserRole::firstOrCreate(['workspace_id' => $user->workspace_id, 'user_id' => $user->id, 'role_id' => $role->id], ['granted_by' => $user->id]);
        });
        $this->info('Super Admin access provisioned for '.$user->email.'. Remove or restrict command access after setup.');
        return self::SUCCESS;
    }
}
