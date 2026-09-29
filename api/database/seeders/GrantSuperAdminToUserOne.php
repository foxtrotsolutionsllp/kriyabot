<?php

namespace Database\Seeders;

use App\Models\AuditLog;
use App\Models\Role;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/** One-time local bootstrap seeder. Assigns Super Admin to the explicitly requested user ID 1. */
class GrantSuperAdminToUserOne extends Seeder
{
    public function run(): void
    {
        DB::transaction(function (): void {
            $user = User::query()->findOrFail(1);
            $role = Role::query()->whereNull('workspace_id')->where('name', 'super_admin')->first();
            if (! $role) {
                $role = Role::create([
                    'workspace_id' => null,
                    'name' => 'super_admin',
                    'description' => 'Platform Super Administrator',
                    'is_system' => true,
                ]);
            }

            $assignment = UserRole::query()->firstOrCreate([
                'workspace_id' => $user->workspace_id,
                'user_id' => $user->id,
                'role_id' => $role->id,
            ], ['granted_by' => null]);

            if ($assignment->wasRecentlyCreated) {
                AuditLog::create([
                    'workspace_id' => $user->workspace_id,
                    'actor_id' => null,
                    'action' => 'security.super_admin_granted',
                    'subject_type' => User::class,
                    'subject_id' => $user->id,
                    'metadata' => ['role' => 'super_admin', 'grant_method' => 'explicit bootstrap seeder'],
                    'created_at' => now(),
                ]);
            }
        });

        $this->command?->info('User ID 1 now has the Super Admin role. Account status and email verification were not changed.');
    }
}
