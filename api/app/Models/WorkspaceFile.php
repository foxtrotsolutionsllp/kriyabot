<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
class WorkspaceFile extends Model
{
    use SoftDeletes;
    protected $fillable = ['workspace_id', 'uploaded_by', 'disk', 'path', 'original_name', 'mime_type', 'size'];
    protected $hidden = ['disk', 'path'];
    public function uploader() { return $this->belongsTo(User::class, 'uploaded_by'); }
}
