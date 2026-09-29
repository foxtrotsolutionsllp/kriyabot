<?php
namespace App\Http\Controllers\Api\V1;
use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Task;
use App\Models\Meeting;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class CalendarController extends Controller
{
    public function index(Request $request)
    {
        $data = $request->validate(['from' => ['required', 'date'], 'to' => ['required', 'date', 'after_or_equal:from']]);
        abort_if(now()->parse($data['to'])->diffInDays(now()->parse($data['from'])) > 93, 422, 'Calendar range cannot exceed 94 days.');
        $user = $request->user();
        $tasks = Task::where('workspace_id', $user->workspace_id)->where(function (Builder $range) use ($data) {
            $range->whereBetween('start_at', [$data['from'], $data['to'].' 23:59:59'])
                ->orWhereBetween('due_at', [$data['from'], $data['to'].' 23:59:59'])
                ->orWhere(fn (Builder $overlap) => $overlap->whereNotNull('start_at')->whereNotNull('due_at')->whereDate('start_at', '<=', $data['from'])->whereDate('due_at', '>=', $data['from']))
                ->orWhereBetween('completed_at', [$data['from'], $data['to'].' 23:59:59']);
        })->with('project:id,name');
        if (! $user->hasRole('workspace_owner')) $tasks->where(fn (Builder $q) => $q->where('created_by', $user->id)->orWhereHas('assignees', fn (Builder $a) => $a->where('users.id', $user->id))->orWhereHas('project.members', fn (Builder $m) => $m->where('users.id', $user->id)));
        $events = [];
        foreach ($tasks->get() as $task) {
            if ($task->start_at || $task->due_at) {
                $start = $task->start_at?->toDateString() ?? $task->due_at->toDateString();
                $end = $task->due_at?->toDateString() ?? $start;
                if ($end < $start) $end = $start;
                $events[] = ['id' => 'task-plan-'.$task->id, 'kind' => 'task', 'phase' => 'plan', 'start' => $start, 'end' => $end, 'title' => $task->title, 'detail' => $task->project?->name ?? 'Personal task', 'status' => $task->status, 'priority' => $task->priority, 'url' => '/app/tasks'];
            }
            if ($task->completed_at) $events[] = ['id' => 'task-completed-'.$task->id, 'kind' => 'task', 'phase' => 'completed', 'start' => $task->completed_at->toDateString(), 'end' => $task->completed_at->toDateString(), 'title' => $task->title, 'detail' => 'Completed', 'status' => $task->status, 'url' => '/app/tasks'];
        }
        $meetings=Meeting::where('workspace_id',$user->workspace_id)->where('created_by',$user->id)->where('status','scheduled')->whereBetween('starts_at',[now()->parse($data['from'])->subDay(), now()->parse($data['to'])->addDay()])->get();
        foreach($meetings as $meeting){$localStart=$meeting->starts_at->copy()->timezone($meeting->timezone);$localEnd=$meeting->ends_at->copy()->timezone($meeting->timezone);if($localStart->toDateString()<$data['from']||$localStart->toDateString()>$data['to'])continue;$events[]=['id'=>'meeting-'.$meeting->id,'kind'=>'meeting','phase'=>'plan','start'=>$localStart->toDateString(),'end'=>$localEnd->toDateString(),'start_at'=>$localStart->toIso8601String(),'end_at'=>$localEnd->toIso8601String(),'timezone'=>$meeting->timezone,'title'=>$meeting->title,'detail'=>trim(($meeting->attendee_name ? 'With '.$meeting->attendee_name.' · ' : '').($meeting->location_label ?? ucfirst($meeting->location_type))),'location_type'=>$meeting->location_type,'location_label'=>$meeting->location_label,'online_url'=>$meeting->online_url,'status'=>'scheduled','url'=>'/app/calendar'];}
        $projects = Project::where('workspace_id', $user->workspace_id)->where(fn (Builder $q) => $q
            ->whereBetween('start_date', [$data['from'], $data['to']])
            ->orWhereBetween('due_date', [$data['from'], $data['to']])
            ->orWhere(fn (Builder $overlap) => $overlap->whereNotNull('start_date')->whereNotNull('due_date')->whereDate('start_date', '<=', $data['from'])->whereDate('due_date', '>=', $data['from']))
        )->with('members:id')->get();
        if (! $user->hasRole('workspace_owner')) $projects = $projects->filter(fn (Project $p) => $p->created_by === $user->id || $p->members->contains('id', $user->id));
        foreach ($projects as $project) {
            $start = $project->start_date?->toDateString() ?? $project->due_date?->toDateString();
            $end = $project->due_date?->toDateString() ?? $start;
            if ($start && $end) $events[] = ['id' => 'project-'.$project->id, 'kind' => 'project', 'phase' => 'plan', 'start' => $start, 'end' => $end, 'title' => $project->name, 'detail' => 'Project milestone', 'status' => $project->status, 'url' => '/app/projects'];
        }
        $unscheduled = Task::where('workspace_id', $user->workspace_id)->whereNull('start_at')->whereNull('due_at')->whereNotIn('status', ['done', 'cancelled']);
        if (! $user->hasRole('workspace_owner')) $unscheduled->where(fn (Builder $q) => $q->where('created_by', $user->id)->orWhereHas('assignees', fn (Builder $a) => $a->where('users.id', $user->id))->orWhereHas('project.members', fn (Builder $m) => $m->where('users.id', $user->id)));
        $unscheduled = $unscheduled->with('project:id,name')->orderByDesc('priority')->orderBy('created_at')->limit(100)->get()->map(fn (Task $task) => ['id' => $task->id, 'title' => $task->title, 'status' => $task->status, 'priority' => $task->priority, 'project' => $task->project?->name ?? 'Personal task']);
        usort($events, fn ($a, $b) => [$a['start'], $a['kind'], $a['title']] <=> [$b['start'], $b['kind'], $b['title']]);
        return response()->json(['events' => $events, 'unscheduled' => $unscheduled, 'counts' => ['scheduled' => count(array_filter($events, fn ($event) => $event['phase'] === 'plan')), 'completed' => count(array_filter($events, fn ($event) => $event['phase'] === 'completed')), 'unscheduled' => $unscheduled->count()]]);
    }
}
