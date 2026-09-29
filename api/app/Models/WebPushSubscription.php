<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WebPushSubscription extends Model
{
    protected $fillable = ['workspace_id', 'user_id', 'endpoint_hash', 'endpoint', 'public_key', 'auth_token'];
}
