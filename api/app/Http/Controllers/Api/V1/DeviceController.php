<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\AuditLogger;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

class DeviceController extends Controller
{
    public function index(Request $request)
    {
        return response()->json($request->user()->tokens()->get(['id', 'name', 'last_used_at', 'created_at', 'expires_at']));
    }

    public function destroy(Request $request, int $token, AuditLogger $audit)
    {
        $device = $request->user()->tokens()->whereKey($token)->firstOrFail();
        $audit->record($request, 'auth.device_revoked', $request->user(), ['token_id' => $device->id, 'device' => $device->name]);
        $device->delete();
        return response()->noContent();
    }
}
