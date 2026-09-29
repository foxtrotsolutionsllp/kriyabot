<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ContentReport extends Model
{
    protected $fillable = ['workspace_id', 'reporter_id', 'subject_type', 'subject_id', 'reason', 'details', 'status', 'reviewed_by', 'reviewed_at'];
    protected $casts = ['reviewed_at' => 'datetime'];
}
