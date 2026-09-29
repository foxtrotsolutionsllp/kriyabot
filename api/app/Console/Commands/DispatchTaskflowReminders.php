<?php
namespace App\Console\Commands;
use App\Models\TaskflowNotification;
use App\Models\TaskflowReminder;
use App\Models\Task;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;
use App\Services\TaskReminderService;
use App\Services\WebPushNotifier;
class DispatchTaskflowReminders extends Command {
    protected $signature='taskflow:dispatch-reminders'; protected $description='Deliver due Kriyabot task and meeting reminders';
    public function handle(): int {
        Task::whereNotNull('due_at')->where('due_at','<=',now()->addMinutes(60))->whereNotIn('status',['done','cancelled'])->with('assignees')->orderBy('id')->chunkById(100,function($tasks){$service=app(TaskReminderService::class);foreach($tasks as $task){if(!TaskflowReminder::whereMorphedTo('remindable',$task)->exists())$service->sync($task);}});
        TaskflowReminder::with(['remindable','user.preferences'])->where('status','pending')->where('remind_at','<=',now())->orderBy('id')->chunkById(100,function($items){foreach($items as $reminder){$item=$reminder->remindable;$user=$reminder->user;if(!$item || !$user || ($item instanceof \App\Models\Meeting && $item->status!=='scheduled')){$reminder->update(['status'=>'cancelled']);continue;}$isMeeting=$item instanceof \App\Models\Meeting;$title=$isMeeting?'Meeting reminder':'Task deadline';$name=$item->title;$body=$isMeeting?'Your meeting “'.$name.'” is coming up.':'Task “'.$name.'” is due soon.';$prefs=$user->preferences;if(!$prefs || $prefs->notify_in_app || $prefs->notify_browser){$notification=TaskflowNotification::create(['workspace_id'=>$reminder->workspace_id,'user_id'=>$user->id,'type'=>$isMeeting?'meeting_reminder':'task_reminder','title'=>$title,'body'=>$body,'data'=>['url'=>$isMeeting?'/app/calendar':'/app/tasks','item_id'=>$item->id]]);if(!$prefs || $prefs->notify_browser)app(WebPushNotifier::class)->send($user,$notification);}if(!$prefs || $prefs->notify_email){try{Mail::raw($body,fn($message)=>$message->to($user->email)->subject($title));}catch(\Throwable $e){report($e);}}$reminder->update(['status'=>'sent']);}});
        return self::SUCCESS;
    }
}
