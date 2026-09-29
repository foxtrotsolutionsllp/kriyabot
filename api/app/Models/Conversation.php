<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Conversation extends Model
{
    protected $fillable = ['workspace_id', 'created_by', 'type', 'direct_key'];
    public function members() { return $this->belongsToMany(User::class, 'conversation_members')->withPivot(['workspace_id', 'last_read_at'])->withTimestamps(); }
    public function messages() { return $this->hasMany(Message::class); }
}
