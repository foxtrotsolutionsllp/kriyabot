<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;

class AutomationController extends Controller
{
    /** Trigger reminder delivery from a hosted HTTP cron service. */
    public function dispatchReminders(Request $request)
    {
        $token = (string) config('taskflow.scheduler_token');
        $provided = (string) $request->header('X-Taskflow-Scheduler');

        if ($token === '') {
            return response()->json(['message' => 'The hosted scheduler is not configured.'], 503);
        }

        if ($provided === '' || ! hash_equals($token, $provided)) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $lock = Cache::lock('taskflow:hosted-reminder-dispatch', 55);
        if (! $lock->get()) {
            return response()->json(['status' => 'already_running'], 202);
        }

        try {
            Artisan::call('taskflow:dispatch-reminders');
            return response()->json(['status' => 'completed']);
        } finally {
            $lock->release();
        }
    }
}
