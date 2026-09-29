<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use App\Models\UserPreference;
use App\Models\UserRole;
use App\Models\Workspace;
use App\Services\AuditLogger;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password as PasswordRule;

class AuthController extends Controller
{
    public function register(Request $request, AuditLogger $audit)
    {
        if (in_array($request->input('timezone'), ['Asia/Calcutta', 'Asia/Kolkatta'], true)) {
            $request->merge(['timezone' => 'Asia/Kolkata']);
        }
        $data = $request->validate(['name' => ['required', 'string', 'max:120'], 'email' => ['required', 'email:rfc', 'max:255', 'unique:users,email'], 'password' => ['required', 'confirmed', PasswordRule::defaults()], 'timezone' => ['nullable', 'timezone'], 'locale' => ['nullable', 'string', 'max:16']]);

        [$workspace, $user] = DB::transaction(function () use ($data): array {
            $workspace = Workspace::create(['name' => $data['name']."'s workspace", 'slug' => Str::slug($data['name']).'-'.Str::lower(Str::random(8))]);
            $user = User::create(['workspace_id' => $workspace->id, 'name' => $data['name'], 'email' => $data['email'], 'password' => $data['password'], 'timezone' => $data['timezone'] ?? 'UTC', 'locale' => $data['locale'] ?? 'en', 'status' => 'active', 'approval_status' => 'pending', 'profile_visibility' => 'workspace']);
            UserPreference::create(['user_id' => $user->id, 'theme' => ['mode' => 'system', 'font_family' => 'system', 'font_size' => 16, 'colors' => []], 'notify_in_app' => true, 'notify_email' => true, 'notify_browser' => false, 'notification_rules' => []]);
            $ownerRole = Role::create(['workspace_id' => $workspace->id, 'name' => 'workspace_owner', 'description' => 'Owner of this workspace', 'is_system' => true]);
            UserRole::create(['workspace_id' => $workspace->id, 'user_id' => $user->id, 'role_id' => $ownerRole->id]);
            return [$workspace, $user];
        });

        event(new Registered($user));
        $audit->record($request, 'auth.registered_pending_approval', $user, ['workspace_id' => $workspace->id]);
        return response()->json(['message' => 'Registration received. Verify your email and wait for Super Admin approval.', 'user' => ['id' => $user->id, 'name' => $user->name, 'email' => $user->email, 'approval_status' => $user->approval_status]], 202);
    }

    public function login(Request $request, AuditLogger $audit)
    {
        $data = $request->validate(['email' => ['required', 'email'], 'password' => ['required', 'string'], 'device_name' => ['nullable', 'string', 'max:120']]);
        $user = User::where('email', $data['email'])->first();
        if (! $user || ! Hash::check($data['password'], $user->password)) {
            return response()->json(['message' => 'The supplied credentials are invalid.'], 422);
        }
        if ($user->status !== 'active' || $user->approval_status !== 'approved') {
            return response()->json(['message' => 'This account is awaiting approval or is unavailable.'], 403);
        }
        if (! $user->hasVerifiedEmail()) {
            return response()->json(['message' => 'Verify your email before signing in.'], 403);
        }

        $settings = $user->workspace?->settings ?? [];
        if (data_get($settings, 'security.single_session', false)) {
            $user->tokens()->delete();
        }
        $token = $user->createToken($data['device_name'] ?? 'browser', ['*'], now()->addDays(30));
        $audit->record($request, 'auth.login', $user, ['device' => $data['device_name'] ?? 'browser']);
        return response()->json(['token' => $token->plainTextToken, 'user' => ['id' => $user->id, 'name' => $user->name, 'email' => $user->email, 'workspace_id' => $user->workspace_id, 'roles' => $user->roleAssignments()->with('role')->get()->pluck('role.name')]]);
    }

    public function logout(Request $request, AuditLogger $audit)
    {
        $audit->record($request, 'auth.logout', $request->user());
        $request->user()->currentAccessToken()?->delete();
        return response()->noContent();
    }

    public function forgotPassword(Request $request)
    {
        $request->validate(['email' => ['required', 'email']]);
        $status = Password::sendResetLink($request->only('email'));
        // Do not disclose whether an email belongs to an account.
        return response()->json(['message' => 'If the account exists, recovery instructions will be sent.'], $status === Password::RESET_LINK_SENT ? 200 : 200);
    }

    public function resetPassword(Request $request)
    {
        $request->validate(['token' => ['required'], 'email' => ['required', 'email'], 'password' => ['required', 'confirmed', PasswordRule::defaults()]]);
        $status = Password::reset($request->only('email', 'password', 'password_confirmation', 'token'), function (User $user, string $password): void {
            $user->forceFill(['password' => $password])->save();
            $user->tokens()->delete();
        });
        return $status === Password::PASSWORD_RESET ? response()->json(['message' => 'Password reset successfully.']) : response()->json(['message' => 'The recovery link is invalid or expired.'], 422);
    }

    public function verifyEmail(Request $request, string $id, string $hash, AuditLogger $audit)
    {
        $user = User::findOrFail($id);
        abort_unless(hash_equals(sha1($user->getEmailForVerification()), $hash), 403);
        if ($user->markEmailAsVerified()) {
            $audit->record($request, 'auth.email_verified', $user);
        }
        return response()->json(['message' => 'Email verified. Account approval may still be pending.']);
    }

    public function sendVerification(Request $request)
    {
        $data = $request->validate(['email' => ['required', 'email']]);
        $user = User::where('email', $data['email'])->first();
        if ($user && ! $user->hasVerifiedEmail()) $user->sendEmailVerificationNotification();
        return response()->json(['message' => 'If the account needs verification, a message will be sent.']);
    }
}
