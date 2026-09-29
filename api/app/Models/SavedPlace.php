<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
class SavedPlace extends Model {
    use SoftDeletes;
    protected $fillable = ['workspace_id','user_id','name','kind','address'];
}
