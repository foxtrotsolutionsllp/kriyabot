<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class WorkspaceMemberController extends Controller
{
    public function index(Request $request)
    {
        $members = User::where('workspace_id', $request->user()->workspace_id)
            ->where('status', 'active')->where('approval_status', 'approved')
            ->where(fn ($query) => $query->where('profile_visibility', '!=', 'private')->orWhere('id', $request->user()->id))
            ->orderBy('name')->get(['id', 'name']);
        return response()->json($members);
    }
}
