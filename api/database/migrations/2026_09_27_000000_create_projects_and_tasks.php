<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('projects', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('workspace_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('name', 180);
            $table->string('slug', 200);
            $table->text('description')->nullable();
            $table->string('status', 24)->default('active');
            $table->date('start_date')->nullable();
            $table->date('due_date')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->unique(['workspace_id', 'slug']);
            $table->index(['workspace_id', 'status', 'updated_at']);
            $table->index(['workspace_id', 'created_by']);
        });

        Schema::create('project_members', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('workspace_id')->constrained()->cascadeOnDelete();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('role', 24)->default('member'); // owner | editor | member | viewer
            $table->foreignId('added_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['workspace_id', 'project_id', 'user_id']);
            $table->index(['workspace_id', 'user_id', 'project_id']);
        });

        Schema::create('tasks', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('workspace_id')->constrained()->cascadeOnDelete();
            $table->foreignId('project_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('parent_task_id')->nullable()->constrained('tasks')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title', 240);
            $table->text('description')->nullable();
            $table->string('status', 24)->default('open'); // open | in_progress | blocked | done | cancelled
            $table->string('priority', 16)->default('normal'); // low | normal | high | urgent
            $table->dateTime('start_at')->nullable();
            $table->dateTime('due_at')->nullable();
            $table->dateTime('completed_at')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();
            $table->index(['workspace_id', 'status', 'due_at']);
            $table->index(['workspace_id', 'project_id', 'status', 'sort_order']);
            $table->index(['workspace_id', 'created_by', 'updated_at']);
            $table->index(['workspace_id', 'parent_task_id']);
        });

        Schema::create('task_assignees', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('workspace_id')->constrained()->cascadeOnDelete();
            $table->foreignId('task_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('assigned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('assigned_at')->useCurrent();
            $table->timestamps();
            $table->unique(['workspace_id', 'task_id', 'user_id']);
            $table->index(['workspace_id', 'user_id', 'task_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('task_assignees');
        Schema::dropIfExists('tasks');
        Schema::dropIfExists('project_members');
        Schema::dropIfExists('projects');
    }
};
