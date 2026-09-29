<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Role;
use App\Models\UserRole;
use App\Models\Workspace;
use App\Services\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RegistrationApprovalController extends Controller
{
    public function index(Request $request)
    {
        // Platform administrators can review all pending registrations.
        return response()->json([
            'registrations' => User::where('approval_status', 'pending')->whereNotNull('email_verified_at')->with('workspace:id,name')->orderBy('created_at')->paginate(30),
            'workspaces' => Workspace::where('status', 'active')->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function approve(Request $request, User $user, AuditLogger $audit)
    {
        $data = $request->validate(['workspace_id' => ['nullable', 'integer', 'exists:workspaces,id']]);
        abort_unless($user->approval_status === 'pending', 409, 'Registration is no longer pending.');
        abort_unless($user->hasVerifiedEmail(), 409, 'The user must verify their email before approval.');
        $sourceWorkspaceId = $user->workspace_id;
        DB::transaction(function () use ($data, $user, $request): void {
            if (! empty($data['workspace_id']) && (int) $data['workspace_id'] !== (int) $user->workspace_id) {
                $destination = Workspace::where('status', 'active')->findOrFail($data['workspace_id']);
                $user->roleAssignments()->delete();
                $member = Role::firstOrCreate(['workspace_id' => $destination->id, 'name' => 'workspace_member'], ['description' => 'Member of this workspace', 'is_system' => true]);
                $user->forceFill(['workspace_id' => $destination->id])->save();
                UserRole::create(['workspace_id' => $destination->id, 'user_id' => $user->id, 'role_id' => $member->id, 'granted_by' => $request->user()->id]);
                $source = Workspace::find($sourceWorkspaceId);
                if ($source && ! $source->users()->where('id', '!=', $user->id)->exists()) $source->delete();
            }
            $user->forceFill(['approval_status' => 'approved', 'approved_by' => $request->user()->id, 'approved_at' => now()])->save();
        });
        $audit->record($request, 'registration.approved', $user, ['source_workspace_id' => $sourceWorkspaceId, 'workspace_id' => $user->workspace_id]);
        return response()->json(['message' => 'Registration approved.']);
    }

    public function reject(Request $request, User $user, AuditLogger $audit)
    {
        $data = $request->validate(['reason' => ['nullable', 'string', 'max:1000']]);
        abort_unless($user->approval_status === 'pending', 409, 'Registration is no longer pending.');
        $user->forceFill(['approval_status' => 'rejected', 'approved_by' => $request->user()->id])->save();
        $audit->record($request, 'registration.rejected', $user, ['reason' => $data['reason'] ?? null]);
        return response()->json(['message' => 'Registration rejected.']);
    }

    public function suspend(Request $request, User $user, AuditLogger $audit)
    {
        $data = $request->validate(['reason' => ['required', 'string', 'max:1000']]);
        $user->forceFill(['status' => 'suspended'])->save();
        $user->tokens()->delete();
        $audit->record($request, 'account.suspended', $user, ['reason' => $data['reason']]);
        return response()->json(['message' => 'Account suspended and active API tokens revoked.']);
    }
}
