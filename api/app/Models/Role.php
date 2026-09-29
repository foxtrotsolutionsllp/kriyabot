<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Role extends Model
{
    protected $fillable = ['workspace_id', 'name', 'description', 'is_system'];
    protected $casts = ['is_system' => 'boolean'];
    public function permissions() { return $this->belongsToMany(Permission::class, 'role_permissions'); }
}
