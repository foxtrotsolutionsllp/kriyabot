<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
class Message extends Model
{
    use SoftDeletes;
    protected $fillable = ['workspace_id', 'conversation_id', 'sender_id', 'body'];
    public function sender() { return $this->belongsTo(User::class, 'sender_id'); }
    public function conversation() { return $this->belongsTo(Conversation::class); }
}
