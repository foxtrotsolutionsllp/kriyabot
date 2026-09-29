<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TaskAttachment extends Model
{
    protected $fillable = ['workspace_id', 'task_id', 'uploaded_by', 'disk', 'path', 'original_name', 'mime_type', 'size'];
    protected $hidden = ['disk', 'path'];

    public function task() { return $this->belongsTo(Task::class); }
    public function uploader() { return $this->belongsTo(User::class, 'uploaded_by'); }
}
