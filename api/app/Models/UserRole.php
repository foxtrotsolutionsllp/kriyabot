<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserRole extends Model
{
    protected $fillable = ['workspace_id', 'user_id', 'role_id', 'granted_by'];
    public function role() { return $this->belongsTo(Role::class); }
}
