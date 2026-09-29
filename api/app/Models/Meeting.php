<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
class Meeting extends Model {
    use SoftDeletes;
    protected $fillable = ['workspace_id','created_by','saved_place_id','title','description','attendee_name','starts_at','ends_at','timezone','location_type','location_label','location_details','online_url','status'];
    protected $casts = ['starts_at'=>'datetime','ends_at'=>'datetime'];
    public function creator(){return $this->belongsTo(User::class,'created_by');}
    public function savedPlace(){return $this->belongsTo(SavedPlace::class);}
}
