<?php

return [
    'name' => env('APP_NAME', 'Kriyabot'), 'env' => env('APP_ENV', 'production'), 'debug' => (bool) env('APP_DEBUG', false), 'url' => env('APP_URL', 'http://localhost'), 'frontend_url' => env('FRONTEND_URL', 'http://localhost:3000'),
    'timezone' => 'UTC', 'locale' => env('APP_LOCALE', 'en'), 'fallback_locale' => 'en', 'faker_locale' => 'en_US', 'key' => env('APP_KEY'), 'cipher' => 'AES-256-CBC',
    'maintenance' => ['driver' => env('APP_MAINTENANCE_DRIVER', 'file'), 'store' => env('APP_MAINTENANCE_STORE', 'database')],
];
