<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class TaskflowReminder extends Model {
    protected $table='taskflow_reminders'; protected $fillable=['workspace_id','user_id','remind_at','status']; protected $casts=['remind_at'=>'datetime'];
    public function remindable(){return $this->morphTo();} public function user(){return $this->belongsTo(User::class);}
}
