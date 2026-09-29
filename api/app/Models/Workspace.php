<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Workspace extends Model
{
    use SoftDeletes;

    protected $fillable = ['name', 'slug', 'status', 'settings'];
    protected $casts = ['settings' => 'array'];

    public function users() { return $this->hasMany(User::class); }
    public function projects() { return $this->hasMany(Project::class); }
    public function tasks() { return $this->hasMany(Task::class); }
}
