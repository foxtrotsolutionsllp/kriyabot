<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserPreference extends Model
{
    protected $fillable = ['user_id', 'theme', 'notify_in_app', 'notify_email', 'notify_browser', 'notification_rules', 'assistant_name', 'assistant_voice', 'assistant_language', 'avatar'];
    protected $casts = ['theme' => 'array', 'notification_rules' => 'array', 'notify_in_app' => 'boolean', 'notify_email' => 'boolean', 'notify_browser' => 'boolean'];
    public function user() { return $this->belongsTo(User::class); }
}
