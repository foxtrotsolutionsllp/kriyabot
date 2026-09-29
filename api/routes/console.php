<?php

use Illuminate\Support\Facades\Schedule;

Schedule::command('taskflow:purge-expired-trash')->daily()->withoutOverlapping();
Schedule::command('taskflow:dispatch-reminders')->everyMinute()->withoutOverlapping();
