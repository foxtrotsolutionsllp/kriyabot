<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Services\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProjectController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Project::where('workspace_id', $user->workspace_id)->with('creator:id,name')->withCount('tasks')->orderByDesc('updated_at');
        if (! $user->hasRole('workspace_owner')) {
            $query->whereHas('members', fn ($members) => $members->where('users.id', $user->id));
        }
        $projects = $query->paginate(30);
        $projects->getCollection()->each(fn (Project $project) => $project->setAttribute('can_manage', $user->can('update', $project)));
        return response()->json($projects);
    }

    public function store(Request $request, AuditLogger $audit)
    {
        $this->authorize('create', Project::class);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:180'],
            'description' => ['nullable', 'string', 'max:10000'],
            'start_date' => ['nullable', 'date'],
            'due_date' => ['nullable', 'date', ...($request->filled('start_date') ? ['after_or_equal:start_date'] : [])],
        ]);

        $project = DB::transaction(function () use ($request, $data): Project {
            $project = Project::create([
                'workspace_id' => $request->user()->workspace_id,
                'created_by' => $request->user()->id,
                'name' => $data['name'],
                'slug' => Str::slug($data['name']).'-'.Str::lower(Str::random(7)),
                'description' => $data['description'] ?? null,
                'status' => 'active',
                'start_date' => $data['start_date'] ?? null,
                'due_date' => $data['due_date'] ?? null,
            ]);
            $project->members()->attach($request->user()->id, ['workspace_id' => $request->user()->workspace_id, 'role' => 'owner', 'added_by' => $request->user()->id]);
            return $project;
        });
        $audit->record($request, 'project.created', $project, ['name' => $project->name]);
        return response()->json($project->load('creator:id,name', 'members:id,name'), 201);
    }

    public function show(Request $request, Project $project)
    {
        $this->authorize('view', $project);
        $project->setAttribute('can_manage', $request->user()->can('update', $project));
        return response()->json($project->load('creator:id,name', 'members:id,name'));
    }

    public function update(Request $request, Project $project, AuditLogger $audit)
    {
        $this->authorize('update', $project);
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:180'],
            'description' => ['sometimes', 'nullable', 'string', 'max:10000'],
            'status' => ['sometimes', 'required', 'in:active,on_hold,completed,archived'],
            'start_date' => ['sometimes', 'nullable', 'date'],
            'due_date' => ['sometimes', 'nullable', 'date', ...($request->filled('start_date') ? ['after_or_equal:start_date'] : [])],
        ]);
        $project->fill($data)->save();
        $audit->record($request, 'project.updated', $project, ['fields' => array_keys($data)]);
        return response()->json($project->fresh()->load('creator:id,name', 'members:id,name'));
    }

    public function destroy(Request $request, Project $project, AuditLogger $audit)
    {
        $this->authorize('delete', $project);
        DB::transaction(function () use ($project, $request, $audit): void {
            $trashedAt = now();
            $project->tasks()->whereNull('deleted_at')->update([
                'deleted_at' => $trashedAt,
                'deleted_with_project_id' => $project->id,
                'updated_at' => $trashedAt,
            ]);
            $project->delete();
            $audit->record($request, 'project.trashed', $project, ['trashed_task_count' => $project->trashedTasks()->where('deleted_with_project_id', $project->id)->count()]);
        });
        return response()->noContent();
    }
}
