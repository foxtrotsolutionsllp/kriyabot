<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Task extends Model
{
    use SoftDeletes;

    protected $fillable = ['workspace_id', 'project_id', 'parent_task_id', 'created_by', 'title', 'description', 'status', 'priority', 'start_at', 'due_at', 'completed_at', 'sort_order'];
    protected $casts = ['start_at' => 'datetime', 'due_at' => 'datetime', 'completed_at' => 'datetime'];

    public function workspace() { return $this->belongsTo(Workspace::class); }
    public function project() { return $this->belongsTo(Project::class); }
    public function parent() { return $this->belongsTo(self::class, 'parent_task_id'); }
    public function creator() { return $this->belongsTo(User::class, 'created_by'); }
    public function assignees() { return $this->belongsToMany(User::class, 'task_assignees')->withPivot(['id', 'workspace_id', 'assigned_by', 'assigned_at'])->withTimestamps(); }
    public function attachments() { return $this->hasMany(TaskAttachment::class); }
}
