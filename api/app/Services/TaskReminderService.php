<?php
namespace App\Services;
use App\Models\Task;
use App\Models\TaskflowReminder;
use App\Models\User;
class TaskReminderService {
    public function sync(Task $task): void {
        TaskflowReminder::whereMorphedTo('remindable',$task)->where('status','pending')->delete();
        if(!$task->due_at || in_array($task->status,['done','cancelled'])) return;
        $users=collect([$task->created_by])->merge($task->assignees()->pluck('users.id'))->unique();
        foreach($users as $id){$minutes=(int)data_get(User::find($id)?->preferences?->notification_rules,'task_reminder_minutes',60);$remindAt=$task->due_at->copy()->subMinutes(max(0,$minutes));if($remindAt->isPast())$remindAt=now();$reminder=new TaskflowReminder(['workspace_id'=>$task->workspace_id,'user_id'=>$id,'remind_at'=>$remindAt,'status'=>'pending']);$reminder->remindable()->associate($task);$reminder->save();}
    }
}
