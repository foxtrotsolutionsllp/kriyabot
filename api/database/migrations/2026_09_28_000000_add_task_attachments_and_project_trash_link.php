<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $table): void {
            $table->unsignedBigInteger('deleted_with_project_id')->nullable()->after('project_id');
            $table->index(['workspace_id', 'deleted_with_project_id']);
        });

        Schema::create('task_attachments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('workspace_id')->constrained()->cascadeOnDelete();
            $table->foreignId('task_id')->constrained()->cascadeOnDelete();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('disk', 50);
            $table->string('path', 500)->unique();
            $table->string('original_name', 255);
            $table->string('mime_type', 160);
            $table->unsignedBigInteger('size');
            $table->timestamps();
            $table->index(['workspace_id', 'task_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('task_attachments');
        Schema::table('tasks', function (Blueprint $table): void {
            $table->dropIndex(['workspace_id', 'deleted_with_project_id']);
            $table->dropColumn('deleted_with_project_id');
        });
    }
};
