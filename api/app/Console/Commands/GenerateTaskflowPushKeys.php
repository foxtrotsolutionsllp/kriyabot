<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class GenerateTaskflowPushKeys extends Command
{
    protected $signature = 'taskflow:generate-push-keys';
    protected $description = 'Generate a VAPID key pair for Kriyabot browser push';

    public function handle(): int
    {
        if (!class_exists(\Minishlink\WebPush\VAPID::class)) {
            $this->error('Install the Web Push dependency first: composer require minishlink/web-push');
            return self::FAILURE;
        }
        $keys=\Minishlink\WebPush\VAPID::createVapidKeys();
        $this->line('Add these values to api/.env. Keep the private key secret and do not commit it:');
        $this->line('TASKFLOW_VAPID_PUBLIC_KEY='.$keys['publicKey']);
        $this->line('TASKFLOW_VAPID_PRIVATE_KEY='.$keys['privateKey']);
        $this->line('TASKFLOW_VAPID_SUBJECT=mailto:your-real-contact-email@example.com');
        return self::SUCCESS;
    }
}
