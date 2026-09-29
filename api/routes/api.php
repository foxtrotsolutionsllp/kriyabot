<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\AccountRequestController;
use App\Http\Controllers\Api\V1\DeviceController;
use App\Http\Controllers\Api\V1\ProfileController;
use App\Http\Controllers\Api\V1\ProjectController;
use App\Http\Controllers\Api\V1\RegistrationApprovalController;
use App\Http\Controllers\Api\V1\TaskController;
use App\Http\Controllers\Api\V1\TaskAttachmentController;
use App\Http\Controllers\Api\V1\TrashController;
use App\Http\Controllers\Api\V1\WorkspaceMemberController;
use App\Http\Controllers\Api\V1\WorkspaceSecurityController;
use App\Http\Controllers\Api\V1\CalendarController;
use App\Http\Controllers\Api\V1\PeopleController;
use App\Http\Controllers\Api\V1\MessageController;
use App\Http\Controllers\Api\V1\WorkspaceFileController;
use App\Http\Controllers\Api\V1\AssistantController;
use App\Http\Controllers\Api\V1\MeetingController;
use App\Http\Controllers\Api\V1\SavedPlaceController;
use App\Http\Controllers\Api\V1\NotificationController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    Route::middleware('throttle:auth')->group(function (): void {
        Route::post('/register', [AuthController::class, 'register']);
        Route::post('/login', [AuthController::class, 'login']);
        Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
        Route::post('/reset-password', [AuthController::class, 'resetPassword']);
        Route::post('/email/verification-notification', [AuthController::class, 'sendVerification']);
        Route::get('/email/verify/{id}/{hash}', [AuthController::class, 'verifyEmail'])
            ->middleware(['signed', 'throttle:6,1'])->name('verification.verify');
    });

    Route::middleware(['auth:sanctum', 'workspace.active'])->group(function (): void {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [ProfileController::class, 'show']);
        Route::patch('/me', [ProfileController::class, 'update']);
        Route::get('/me/devices', [DeviceController::class, 'index']);
        Route::delete('/me/devices/{token}', [DeviceController::class, 'destroy']);
        Route::post('/me/account-requests', [AccountRequestController::class, 'store']);
        Route::get('/workspace/members', [WorkspaceMemberController::class, 'index']);
        Route::get('/calendar', [CalendarController::class, 'index']);
        Route::get('/assistant/context', [AssistantController::class, 'context']);
        Route::post('/assistant/parse', [AssistantController::class, 'parse'])->middleware('throttle:30,1');
        Route::post('/assistant/ask', [AssistantController::class, 'ask'])->middleware('throttle:20,1');
        Route::get('/meetings', [MeetingController::class, 'index']);
        Route::post('/meetings', [MeetingController::class, 'store']);
        Route::delete('/meetings/{meeting}', [MeetingController::class, 'destroy']);
        Route::post('/saved-places', [SavedPlaceController::class, 'store']);
        Route::delete('/saved-places/{place}', [SavedPlaceController::class, 'destroy']);
        Route::get('/notifications', [NotificationController::class, 'index']);
        Route::post('/notifications/{notification}/read', [NotificationController::class, 'read']);
        Route::get('/notifications/push/key', [NotificationController::class, 'pushKey']);
        Route::post('/notifications/push/subscriptions', [NotificationController::class, 'subscribe'])->middleware('throttle:10,1');
        Route::post('/notifications/push/unsubscribe', [NotificationController::class, 'unsubscribe'])->middleware('throttle:10,1');
        Route::get('/people', [PeopleController::class, 'index']);
        Route::get('/conversations', [MessageController::class, 'index']);
        Route::post('/conversations/direct', [MessageController::class, 'startDirect']);
        Route::get('/conversations/{conversation}/messages', [MessageController::class, 'messages']);
        Route::post('/conversations/{conversation}/messages', [MessageController::class, 'send']);
        Route::get('/files', [WorkspaceFileController::class, 'index']);
        Route::post('/files', [WorkspaceFileController::class, 'store']);
        Route::get('/files/{file}/preview', [WorkspaceFileController::class, 'preview']);
        Route::delete('/files/{file}', [WorkspaceFileController::class, 'destroy']);

        Route::get('/trash', [TrashController::class, 'index']);
        Route::post('/trash/projects/{id}/restore', [TrashController::class, 'restoreProject']);
        Route::post('/trash/tasks/{id}/restore', [TrashController::class, 'restoreTask']);
        Route::delete('/trash/projects/{id}', [TrashController::class, 'permanentlyDeleteProject']);
        Route::delete('/trash/tasks/{id}', [TrashController::class, 'permanentlyDeleteTask']);

        Route::get('/projects', [ProjectController::class, 'index']);
        Route::post('/projects', [ProjectController::class, 'store']);
        Route::get('/projects/{project}', [ProjectController::class, 'show']);
        Route::patch('/projects/{project}', [ProjectController::class, 'update']);
        Route::delete('/projects/{project}', [ProjectController::class, 'destroy']);

        Route::get('/tasks', [TaskController::class, 'index']);
        Route::post('/tasks', [TaskController::class, 'store']);
        Route::patch('/tasks/{task}/status', [TaskController::class, 'changeStatus']);
        Route::get('/tasks/{task}/attachments', [TaskAttachmentController::class, 'index']);
        Route::post('/tasks/{task}/attachments', [TaskAttachmentController::class, 'store']);
        Route::get('/tasks/{task}/attachments/{attachment}/preview', [TaskAttachmentController::class, 'preview']);
        Route::delete('/tasks/{task}/attachments/{attachment}', [TaskAttachmentController::class, 'destroy']);
        Route::get('/tasks/{task}', [TaskController::class, 'show']);
        Route::patch('/tasks/{task}', [TaskController::class, 'update']);
        Route::delete('/tasks/{task}', [TaskController::class, 'destroy']);

        Route::middleware(['role:super_admin'])->prefix('admin')->group(function (): void {
            Route::get('/registrations', [RegistrationApprovalController::class, 'index']);
            Route::post('/registrations/{user}/approve', [RegistrationApprovalController::class, 'approve']);
            Route::post('/registrations/{user}/reject', [RegistrationApprovalController::class, 'reject']);
            Route::post('/users/{user}/suspend', [RegistrationApprovalController::class, 'suspend']);
            Route::patch('/workspace/security', [WorkspaceSecurityController::class, 'update']);
        });
    });
});
