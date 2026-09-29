<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireApprovedAccount
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (! $user || $user->status !== 'active' || $user->approval_status !== 'approved' || $user->workspace?->status !== 'active') {
            return response()->json(['message' => 'This account is pending approval or unavailable.'], 403);
        }

        return $next($request);
    }
}
