<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ResolveWorkspace
{
    public function handle(Request $request, Closure $next): Response
    {
        // Never trust a workspace ID supplied by the client. Resolve tenant context from the authenticated member.
        if ($request->user()) {
            app()->instance('taskflow.workspace_id', (int) $request->user()->workspace_id);
        }

        return $next($request);
    }
}
