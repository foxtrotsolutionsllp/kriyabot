<?php

return ['default' => env('FILESYSTEM_DISK', 'private'), 'disks' => ['private' => ['driver' => 'local', 'root' => storage_path('app/private'), 'serve' => false, 'throw' => false], 'public' => ['driver' => 'local', 'root' => storage_path('app/public'), 'url' => rtrim(env('APP_URL', 'http://localhost'), '/').'/storage', 'visibility' => 'public', 'throw' => false]], 'links' => [public_path('storage') => storage_path('app/public')]];
