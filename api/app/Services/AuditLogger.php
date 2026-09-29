<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditLogger
{
    public function record(Request $request, string $action, ?object $subject = null, array $metadata = []): void
    {
        AuditLog::create([
            'workspace_id' => $request->user()?->workspace_id,
            'actor_id' => $request->user()?->id,
            'action' => $action,
            'subject_type' => $subject ? $subject::class : null,
            'subject_id' => $subject?->getKey(),
            'ip_address' => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 2000),
            'metadata' => $metadata,
            'created_at' => now(),
        ]);
    }
}
