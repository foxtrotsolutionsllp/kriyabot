<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AccountRequest extends Model
{
    protected $fillable = ['workspace_id', 'user_id', 'type', 'status', 'requested_at', 'completed_at', 'metadata'];
    protected $casts = ['requested_at' => 'datetime', 'completed_at' => 'datetime', 'metadata' => 'array'];
}
