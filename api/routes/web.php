<?php

use Illuminate\Support\Facades\Route;

Route::get('/', fn () => response()->json(['name' => 'Kriyabot API', 'version' => 'v1']));
