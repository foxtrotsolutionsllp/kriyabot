<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AccountRequest;
use App\Services\AuditLogger;
use Illuminate\Http\Request;

class AccountRequestController extends Controller
{
    public function store(Request $request, AuditLogger $audit)
    {
        $data = $request->validate(['type' => ['required', 'in:export,deletion']]);
        $accountRequest = AccountRequest::create(['workspace_id' => $request->user()->workspace_id, 'user_id' => $request->user()->id, 'type' => $data['type'], 'status' => 'requested', 'requested_at' => now()]);
        $audit->record($request, 'account.'.$data['type'].'_requested', $accountRequest);
        return response()->json(['message' => 'Your request was recorded for administrative processing.', 'request_id' => $accountRequest->id], 202);
    }
}
