<?php

namespace App\Services;

use App\Models\Project;
use App\Models\Task;
use Illuminate\Support\Facades\DB;

class TrashRetentionService
{
    public function permanentlyDeleteTask(Task $task): void
    {
        $attachments = $task->attachments()->get();
        foreach ($attachments as $attachment) {
            $this->deleteStoredFile($attachment->disk, $attachment->path);
        }
        DB::transaction(fn () => $task->forceDelete());
    }

    public function permanentlyDeleteProject(Project $project): void
    {
        $tasks = Task::withTrashed()->where('project_id', $project->id)->with('attachments')->get();
        foreach ($tasks as $task) {
            foreach ($task->attachments as $attachment) {
                $this->deleteStoredFile($attachment->disk, $attachment->path);
            }
        }
        DB::transaction(function () use ($project, $tasks): void {
            foreach ($tasks as $task) $task->forceDelete();
            $project->forceDelete();
        });
    }

    public function purgeExpired(): array
    {
        $cutoff = now()->subDays((int) config('taskflow.trash.retention_days', 10));
        $projectsDeleted = 0;
        Project::onlyTrashed()->where('deleted_at', '<=', $cutoff)->chunkById(100, function ($projects) use (&$projectsDeleted): void {
            foreach ($projects as $project) {
                $this->permanentlyDeleteProject($project);
                $projectsDeleted++;
            }
        });

        $tasksDeleted = 0;
        Task::onlyTrashed()->whereNull('deleted_with_project_id')->where('deleted_at', '<=', $cutoff)->chunkById(100, function ($tasks) use (&$tasksDeleted): void {
            foreach ($tasks as $task) {
                $this->permanentlyDeleteTask($task);
                $tasksDeleted++;
            }
        });
        return ['projects' => $projectsDeleted, 'tasks' => $tasksDeleted];
    }

    private function deleteStoredFile(string $disk, string $path): void
    {
        $storage = \Illuminate\Support\Facades\Storage::disk($disk);
        if ($storage->exists($path) && ! $storage->delete($path)) {
            throw new \RuntimeException('Could not permanently remove a private task attachment.');
        }
    }
}
