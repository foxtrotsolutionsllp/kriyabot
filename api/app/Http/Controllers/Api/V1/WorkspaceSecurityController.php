<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Workspace;
use App\Services\AuditLogger;
use Illuminate\Http\Request;

class WorkspaceSecurityController extends Controller
{
    public function update(Request $request, AuditLogger $audit)
    {
        $data = $request->validate(['single_session' => ['required', 'boolean'], 'workspace_id' => ['nullable', 'integer', 'exists:workspaces,id']]);
        $workspace = isset($data['workspace_id']) ? Workspace::where('status', 'active')->findOrFail($data['workspace_id']) : $request->user()->workspace;
        $settings = $workspace->settings ?? [];
        data_set($settings, 'security.single_session', $data['single_session']);
        $workspace->update(['settings' => $settings]);
        $audit->record($request, 'workspace.security_updated', $workspace, ['single_session' => $data['single_session']]);
        return response()->json(['single_session' => data_get($workspace->fresh()->settings, 'security.single_session')]);
    }
}
