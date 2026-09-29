<?php

namespace App\Services;

use App\Models\TaskflowNotification;
use App\Models\User;
use App\Models\WebPushSubscription;
use Illuminate\Support\Facades\Log;

class WebPushNotifier
{
    public function send(User $user, TaskflowNotification $notification): void
    {
        $public=config('taskflow.push.vapid_public_key');
        $private=config('taskflow.push.vapid_private_key');
        if(!filled($public)||!filled($private))return;
        if(!class_exists(\Minishlink\WebPush\WebPush::class)){
            Log::warning('Web push dependency is missing. Install minishlink/web-push to deliver background notifications.');
            return;
        }

        $auth=['VAPID'=>['subject'=>config('taskflow.push.vapid_subject'),'publicKey'=>$public,'privateKey'=>$private]];
        try{
            $webPush=new \Minishlink\WebPush\WebPush($auth,['TTL'=>300,'urgency'=>'high']);
            $subscriptions=WebPushSubscription::where('workspace_id',$user->workspace_id)->where('user_id',$user->id)->get();
            foreach($subscriptions as $stored){
                $subscription=\Minishlink\WebPush\Subscription::create(['endpoint'=>$stored->endpoint,'keys'=>['p256dh'=>$stored->public_key,'auth'=>$stored->auth_token]]);
                $webPush->queueNotification($subscription,json_encode(['title'=>$notification->title,'body'=>$notification->body,'url'=>data_get($notification->data,'url','/app'),'tag'=>'taskflow-'.$notification->id],JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE));
            }
            foreach($webPush->flush() as $report){
                if($report->isSuccess())continue;
                $endpoint=(string)$report->getRequest()->getUri();
                Log::warning('Kriyabot web push delivery failed',['reason'=>$report->getReason()]);
                if($report->isSubscriptionExpired())WebPushSubscription::where('user_id',$user->id)->where('endpoint_hash',hash('sha256',$endpoint))->delete();
            }
        }catch(\Throwable $error){Log::error('Kriyabot web push dispatch failed',['user_id'=>$user->id,'error'=>$error->getMessage()]);}
    }
}
