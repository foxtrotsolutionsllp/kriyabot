<?php

use App\Http\Middleware\RequireApprovedAccount;
use App\Http\Middleware\RequireRole;
use App\Http\Middleware\ResolveWorkspace;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(api: __DIR__.'/../routes/api.php', web: __DIR__.'/../routes/web.php', commands: __DIR__.'/../routes/console.php', health: '/up')
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'workspace.active' => RequireApprovedAccount::class,
            'role' => RequireRole::class,
        ]);
        $middleware->api(append: [ResolveWorkspace::class]);
    })
    ->withProviders([App\Providers\AppServiceProvider::class])
    ->withExceptions(function (Exceptions $exceptions): void {})
    ->create();
