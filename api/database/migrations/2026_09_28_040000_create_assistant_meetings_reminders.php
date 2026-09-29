<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('saved_places', function (Blueprint $table): void {
            $table->id(); $table->foreignId('workspace_id')->constrained()->cascadeOnDelete(); $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name', 120); $table->string('kind', 24)->default('custom'); $table->string('address')->nullable(); $table->timestamps(); $table->softDeletes();
            $table->index(['workspace_id', 'user_id', 'name']);
        });
        Schema::create('meetings', function (Blueprint $table): void {
            $table->id(); $table->foreignId('workspace_id')->constrained()->cascadeOnDelete(); $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->string('title', 240); $table->text('description')->nullable(); $table->string('attendee_name', 180)->nullable();
            $table->dateTime('starts_at'); $table->dateTime('ends_at'); $table->string('timezone', 64); $table->string('location_type', 24)->default('custom');
            $table->string('location_label', 180)->nullable(); $table->text('location_details')->nullable(); $table->text('online_url')->nullable();
            $table->string('status', 20)->default('scheduled'); $table->timestamps(); $table->softDeletes();
            $table->index(['workspace_id', 'created_by', 'starts_at']); $table->index(['workspace_id', 'starts_at', 'status']);
        });
        Schema::create('taskflow_reminders', function (Blueprint $table): void {
            $table->id(); $table->foreignId('workspace_id')->constrained()->cascadeOnDelete(); $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->morphs('remindable'); $table->dateTime('remind_at'); $table->string('status', 16)->default('pending'); $table->timestamps();
            $table->index(['status', 'remind_at']);
        });
        Schema::create('taskflow_notifications', function (Blueprint $table): void {
            $table->id(); $table->foreignId('workspace_id')->constrained()->cascadeOnDelete(); $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('type', 40); $table->string('title', 180); $table->text('body'); $table->json('data')->nullable(); $table->dateTime('read_at')->nullable(); $table->timestamps();
            $table->index(['user_id', 'read_at', 'created_at']);
        });
    }
    public function down(): void
    {
        Schema::dropIfExists('taskflow_notifications'); Schema::dropIfExists('taskflow_reminders'); Schema::dropIfExists('meetings'); Schema::dropIfExists('saved_places');
    }
};
