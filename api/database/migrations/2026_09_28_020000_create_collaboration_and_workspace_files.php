<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('conversations', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('workspace_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('type', 20)->default('direct');
            $table->string('direct_key', 80);
            $table->timestamps();
            $table->unique(['workspace_id', 'direct_key']);
            $table->index(['workspace_id', 'updated_at']);
        });
        Schema::create('conversation_members', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('workspace_id')->constrained()->cascadeOnDelete();
            $table->foreignId('conversation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamp('last_read_at')->nullable();
            $table->timestamps();
            $table->unique(['conversation_id', 'user_id']);
            $table->index(['workspace_id', 'user_id', 'conversation_id']);
        });
        Schema::create('messages', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('workspace_id')->constrained()->cascadeOnDelete();
            $table->foreignId('conversation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sender_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('body');
            $table->timestamps();
            $table->softDeletes();
            $table->index(['workspace_id', 'conversation_id', 'created_at']);
        });
        Schema::create('workspace_files', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('workspace_id')->constrained()->cascadeOnDelete();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('disk', 40);
            $table->string('path', 1024);
            $table->string('original_name', 255);
            $table->string('mime_type', 180);
            $table->unsignedBigInteger('size');
            $table->timestamps();
            $table->softDeletes();
            $table->index(['workspace_id', 'created_at']);
            $table->index(['workspace_id', 'uploaded_by']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('workspace_files');
        Schema::dropIfExists('messages');
        Schema::dropIfExists('conversation_members');
        Schema::dropIfExists('conversations');
    }
};
