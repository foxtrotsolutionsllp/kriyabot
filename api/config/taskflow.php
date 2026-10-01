<?php

return [
    // Used only by the shared-hosting HTTP scheduler endpoint. Keep this secret private.
    'scheduler_token' => env('TASKFLOW_SCHEDULER_TOKEN'),
    'ai' => ['api_key' => env('OPENAI_API_KEY'), 'model' => env('OPENAI_MODEL', 'gpt-4.1-mini')],
    'push' => [
        'vapid_public_key' => env('TASKFLOW_VAPID_PUBLIC_KEY'),
        'vapid_private_key' => env('TASKFLOW_VAPID_PRIVATE_KEY'),
        'vapid_subject' => env('TASKFLOW_VAPID_SUBJECT', 'mailto:noreply@taskflow.local'),
    ],
    'trash' => ['retention_days' => 10],
    'uploads' => [
        // Baseline limits are intentionally conservative; expose quota management to admins later.
        'max_file_bytes' => (int) env('TASKFLOW_MAX_UPLOAD_BYTES', 10 * 1024 * 1024),
        'allowed_mime_types' => ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'text/plain', 'text/csv', 'application/msword', 'application/vnd.ms-excel', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
        'disk' => env('TASKFLOW_PRIVATE_DISK', 'private'),
    ],
];
