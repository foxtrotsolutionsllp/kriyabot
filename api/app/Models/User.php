<?php

namespace App\Models;

use Illuminate\Auth\MustVerifyEmail as MustVerifyEmailTrait;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable implements MustVerifyEmail
{
    use HasApiTokens, HasFactory, MustVerifyEmailTrait, Notifiable, SoftDeletes;

    protected $fillable = ['workspace_id', 'name', 'job_title', 'department', 'phone', 'location', 'bio', 'email', 'password', 'status', 'approval_status', 'approved_at', 'approved_by', 'timezone', 'locale', 'profile_visibility', 'two_factor_enabled', 'two_factor_secret'];
    protected $hidden = ['password', 'remember_token', 'two_factor_secret', 'two_factor_recovery_codes'];
    protected $casts = ['email_verified_at' => 'datetime', 'approved_at' => 'datetime', 'password' => 'hashed', 'two_factor_enabled' => 'boolean', 'two_factor_secret' => 'encrypted', 'two_factor_recovery_codes' => 'encrypted:array'];

    public function workspace() { return $this->belongsTo(Workspace::class); }
    public function preferences() { return $this->hasOne(UserPreference::class); }
    public function taskflowReminders() { return $this->hasMany(TaskflowReminder::class); }
    public function roleAssignments() { return $this->hasMany(UserRole::class); }
    public function createdProjects() { return $this->hasMany(Project::class, 'created_by'); }
    public function projectMemberships() { return $this->belongsToMany(Project::class, 'project_members')->withPivot(['workspace_id', 'role'])->withTimestamps(); }
    public function createdTasks() { return $this->hasMany(Task::class, 'created_by'); }
    public function assignedTasks() { return $this->belongsToMany(Task::class, 'task_assignees')->withPivot(['workspace_id', 'assigned_by', 'assigned_at'])->withTimestamps(); }

    public function hasRole(string $name): bool
    {
        return $this->roleAssignments()->where('workspace_id', $this->workspace_id)->whereHas('role', fn ($query) => $query->where('name', $name)->where(function ($q) { $q->whereNull('workspace_id')->orWhere('workspace_id', $this->workspace_id); }))->exists();
    }

    public function hasPermission(string $permission): bool
    {
        if ($this->hasRole('super_admin')) return true;
        return $this->roleAssignments()->where('workspace_id', $this->workspace_id)->whereHas('role.permissions', fn ($query) => $query->where('name', $permission))->exists();
    }
}
