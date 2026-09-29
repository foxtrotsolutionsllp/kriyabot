<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Project extends Model
{
    use SoftDeletes;

    protected $fillable = ['workspace_id', 'created_by', 'name', 'slug', 'description', 'status', 'start_date', 'due_date'];
    protected $casts = ['start_date' => 'date', 'due_date' => 'date'];

    public function workspace() { return $this->belongsTo(Workspace::class); }
    public function creator() { return $this->belongsTo(User::class, 'created_by'); }
    public function members() { return $this->belongsToMany(User::class, 'project_members')->withPivot(['id', 'workspace_id', 'role', 'added_by'])->withTimestamps(); }
    public function tasks() { return $this->hasMany(Task::class); }
    public function trashedTasks() { return $this->hasMany(Task::class)->withTrashed(); }
}
