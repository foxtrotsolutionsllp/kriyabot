<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class ProfileController extends Controller
{
    public function show(Request $request)
    {
        return response()->json($request->user()->load('preferences', 'roleAssignments.role:id,name')->makeHidden(['two_factor_secret', 'two_factor_recovery_codes']));
    }

    public function update(Request $request, AuditLogger $audit)
    {
        $user = $request->user();
        if (in_array($request->input('timezone'), ['Asia/Calcutta', 'Asia/Kolkatta'], true)) {
            $request->merge(['timezone' => 'Asia/Kolkata']);
        }
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'job_title' => ['sometimes', 'nullable', 'string', 'max:120'],
            'department' => ['sometimes', 'nullable', 'string', 'max:120'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:40'],
            'location' => ['sometimes', 'nullable', 'string', 'max:160'],
            'bio' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'timezone' => ['sometimes', 'timezone'], 'locale' => ['sometimes', 'string', 'max:16'],
            'profile_visibility' => ['sometimes', 'in:workspace,public,private'],
            'preferences.theme' => ['sometimes', 'array'], 'preferences.theme.mode' => ['sometimes', 'in:light,dark,system'],
            'preferences.theme.font_family' => ['sometimes', 'string', 'max:100'], 'preferences.theme.font_size' => ['sometimes', 'integer', 'between:12,24'], 'preferences.theme.colors' => ['sometimes', 'array'],
            'preferences.theme.colors.accent' => ['sometimes', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'preferences.theme.colors.heading' => ['sometimes', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'preferences.theme.colors.text' => ['sometimes', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'preferences.theme.colors.background' => ['sometimes', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'preferences.theme.colors.surface' => ['sometimes', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'preferences.notify_in_app' => ['sometimes', 'boolean'], 'preferences.notify_email' => ['sometimes', 'boolean'], 'preferences.notify_browser' => ['sometimes', 'boolean'], 'preferences.notification_rules' => ['sometimes', 'array'],
            'preferences.assistant_name' => ['sometimes', 'string', 'min:2', 'max:40'],
            'preferences.assistant_voice' => ['sometimes', 'in:india_female_warm,india_female_soft,india_male_warm,india_male_soft,india_auto'],
            'preferences.assistant_language' => ['sometimes', 'in:en-IN,hi-IN'],
            'preferences.avatar' => ['sometimes', 'nullable', 'string', 'max:1400000'],
        ]);
        if (array_key_exists('avatar', $data['preferences'] ?? []) && $data['preferences']['avatar'] !== null) {
            $avatar = $data['preferences']['avatar'];
            $presets = ['preset:violet', 'preset:orange', 'preset:blue', 'preset:green', 'preset:rose', 'preset:teal'];
            if (! in_array($avatar, $presets, true)) {
                if (preg_match('/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+\/=]+)$/', $avatar, $matches) !== 1) {
                    throw ValidationException::withMessages(['preferences.avatar' => 'Choose a supported image or one of the built-in avatars.']);
                }
                $bytes = base64_decode($matches[2], true);
                $image = $bytes === false ? false : @getimagesizefromstring($bytes);
                if ($bytes === false || strlen($bytes) > 1_000_000 || ! $image || ! in_array($image['mime'] ?? '', ['image/png', 'image/jpeg', 'image/webp'], true)) {
                    throw ValidationException::withMessages(['preferences.avatar' => 'Profile photos must be PNG, JPG, or WebP images under 1 MB.']);
                }
            }
        }
        $user->fill(collect($data)->except('preferences')->all())->save();
        if (isset($data['preferences'])) {
            $user->preferences()->updateOrCreate([], $data['preferences']);
        }
        $audit->record($request, 'profile.updated', $user, ['fields' => array_keys($data)]);
        return $this->show($request);
    }
}
