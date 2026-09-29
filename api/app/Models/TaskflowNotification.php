<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class TaskflowNotification extends Model { protected $table='taskflow_notifications'; protected $fillable=['workspace_id','user_id','type','title','body','data','read_at']; protected $casts=['data'=>'array','read_at'=>'datetime']; }
