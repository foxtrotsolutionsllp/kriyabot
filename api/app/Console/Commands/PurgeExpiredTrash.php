<?php

namespace App\Console\Commands;

use App\Services\TrashRetentionService;
use Illuminate\Console\Command;

class PurgeExpiredTrash extends Command
{
    protected $signature = 'taskflow:purge-expired-trash';
    protected $description = 'Permanently remove TaskFlow trash after the 10-day recovery window.';

    public function handle(TrashRetentionService $trash): int
    {
        $deleted = $trash->purgeExpired();
        $this->info("Permanently removed {$deleted['projects']} expired projects and {$deleted['tasks']} expired tasks.");
        return self::SUCCESS;
    }
}
