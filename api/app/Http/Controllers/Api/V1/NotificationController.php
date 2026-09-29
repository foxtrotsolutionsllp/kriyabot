<?php
namespace App\Http\Controllers\Api\V1;
use App\Http\Controllers\Controller;
use App\Models\TaskflowNotification;
use App\Models\WebPushSubscription;
use Illuminate\Http\Request;
class NotificationController extends Controller {
    public function index(Request $r){return response()->json(TaskflowNotification::where('workspace_id',$r->user()->workspace_id)->where('user_id',$r->user()->id)->latest()->limit(30)->get());}
    public function read(Request $r,TaskflowNotification $notification){abort_unless($notification->workspace_id===$r->user()->workspace_id && $notification->user_id===$r->user()->id,404);$notification->update(['read_at'=>now()]);return response()->noContent();}
    public function pushKey(){ $key=config('taskflow.push.vapid_public_key'); $configured=filled($key)&&filled(config('taskflow.push.vapid_private_key'))&&class_exists(\Minishlink\WebPush\WebPush::class); return response()->json(['configured'=>$configured,'public_key'=>$key]); }
    public function subscribe(Request $request){
        $user=$request->user();
        $data=$request->validate(['endpoint'=>['required','url','max:4096','regex:/^https:\/\//i'],'keys'=>['required','array'],'keys.p256dh'=>['required','string','max:255'],'keys.auth'=>['required','string','max:255']]);
        $hash=hash('sha256',$data['endpoint']);
        $subscription=WebPushSubscription::updateOrCreate(['endpoint_hash'=>$hash],['workspace_id'=>$user->workspace_id,'user_id'=>$user->id,'endpoint'=>$data['endpoint'],'public_key'=>$data['keys']['p256dh'],'auth_token'=>$data['keys']['auth']]);
        return response()->json(['id'=>$subscription->id,'subscribed'=>true],201);
    }
    public function unsubscribe(Request $request){
        $data=$request->validate(['endpoint'=>['required','url','max:4096','regex:/^https:\/\//i']]);
        WebPushSubscription::where('workspace_id',$request->user()->workspace_id)->where('user_id',$request->user()->id)->where('endpoint_hash',hash('sha256',$data['endpoint']))->delete();
        return response()->noContent();
    }
}
