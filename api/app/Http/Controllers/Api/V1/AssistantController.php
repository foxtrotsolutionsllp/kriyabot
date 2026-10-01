<?php
namespace App\Http\Controllers\Api\V1;
use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\SavedPlace;
use App\Models\Task;
use App\Models\Meeting;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\Client\ConnectionException;

class AssistantController extends Controller
{
    public function context(Request $request)
    {
        $user=$request->user();
        return response()->json([
            'projects'=>Project::where('workspace_id',$user->workspace_id)->where(fn($q)=>$q->where('created_by',$user->id)->orWhereHas('members',fn($m)=>$m->where('users.id',$user->id)))->orderBy('name')->get(['id','name']),
            'places'=>SavedPlace::where('workspace_id',$user->workspace_id)->where('user_id',$user->id)->orderBy('name')->get(['id','name','kind','address']),
            'timezone'=>$this->userTimezone($user), 'today_schedule'=>$this->todaySchedule($user), 'configured'=>filled(config('taskflow.ai.api_key')),
            'assistant_name'=>$user->preferences?->assistant_name ?: 'Kriyabot Assistant',
            'assistant_voice'=>$user->preferences?->assistant_voice ?: 'india_female_warm',
            'assistant_language'=>$user->preferences?->assistant_language ?: ($user->locale === 'hi' ? 'hi-IN' : 'en-IN'),
            'user_name'=>$user->name,
        ]);
    }

    public function parse(Request $request)
    {
        $data=$request->validate(['command'=>['required','string','max:2000'],'input_language'=>['sometimes','in:en-IN,hi-IN']]);
        $user=$request->user(); $timezone=$this->userTimezone($user); $projects=Project::where('workspace_id',$user->workspace_id)->where(fn($q)=>$q->where('created_by',$user->id)->orWhereHas('members',fn($m)=>$m->where('users.id',$user->id)))->pluck('name');
        $places=SavedPlace::where('workspace_id',$user->workspace_id)->where('user_id',$user->id)->get(['id','name','kind','address']);
        $key=config('taskflow.ai.api_key');
        if (! $key) return response()->json(['message'=>'The AI assistant is not configured yet. Add OPENAI_API_KEY to the API .env file, then restart Laravel.'],422);
        $languageInstruction = ($data['input_language'] ?? 'en-IN') === 'hi-IN'
            ? 'The user spoke Hindi. Understand and translate the command into English before extracting its intent. Return title, description, project_name, attendee_name, and location_label in English so saved records are in English. Write reply and clarification in natural Hindi (Devanagari).'
            : 'The user spoke Indian English. Return all draft fields and replies in English.';
        $prompt="Interpret one Kriyabot command as a task or meeting draft. ".$languageInstruction." Never claim you created anything. Return JSON only with keys: kind (task|meeting|clarification), reply, title, description, project_name, priority (low|normal|high|urgent), due_at (ISO 8601 or null), starts_at (ISO 8601 or null), ends_at (ISO 8601 or null), attendee_name, reminder_minutes (integer or null), location_type (office|saved_place|online|custom|null), location_label, online_url, clarification. Current local time is ".now($timezone)->toIso8601String()." and timezone is ".$timezone.". If date lacks year choose next future occurrence. A meeting without end time lasts one hour. If the user requests a task reminder but gives no due date, ask for the due date. Use a clarification if required details cannot be inferred. Existing projects: ".$projects->implode(', ').". Saved places (use exact name as location_label when selected): ".$places->map(fn($p)=>$p->name.' ('.$p->kind.')')->implode(', ').". User command: ".$data['command'];
        try{$response=Http::withToken($key)->timeout(35)->post('https://api.openai.com/v1/responses',[
            'model'=>config('taskflow.ai.model','gpt-4.1-mini'),'store'=>false,'input'=>$prompt,
            'text'=>['format'=>['type'=>'json_object']],
        ]);}catch(ConnectionException $e){$detail=$e->getMessage();Log::error('Kriyabot AI connection failed',['error'=>$detail]);$hint=str_contains(strtolower($detail),'certificate')||str_contains(strtolower($detail),'ssl')?'The API server could not verify the AI service TLS certificate. Check PHP/OpenSSL certificates and system time.':(str_contains(strtolower($detail),'getaddrinfo')||str_contains(strtolower($detail),'resolve')?'The API server could not resolve api.openai.com. Check DNS and outbound internet access.':'The API server could not connect to api.openai.com. Check outbound HTTPS access and try again.');return response()->json(['message'=>$hint],502);}catch(\Throwable $e){Log::error('Kriyabot AI request failed',['type'=>get_class($e),'error'=>$e->getMessage()]);return response()->json(['message'=>'The API server failed while contacting the AI service. Check storage/logs/laravel.log for the underlying error.'],502);}
        if (! $response->successful()) {$status=$response->status();$providerMessage=(string)data_get($response->json(),'error.message','');Log::warning('Kriyabot AI service returned an error',['status'=>$status,'provider_message'=>$providerMessage]);$message=match($status){401=>'The OpenAI API key was rejected. Check OPENAI_API_KEY in api/.env, then run php artisan config:clear and restart Laravel.',403=>'OpenAI denied this request. Check that the API project allows the selected model.',429=>'OpenAI rate limit or usage limit reached. Check API billing and project limits.',default=>'The AI service returned HTTP '.$status.($providerMessage!==''?': '.$providerMessage:'')};return response()->json(['message'=>$message],502);}
        $payload=$response->json(); $outputText=collect($payload['output'] ?? [])->flatMap(fn($item)=>$item['content'] ?? [])->first(fn($content)=>($content['type'] ?? null)==='output_text'); $raw=$outputText['text'] ?? $payload['output_text'] ?? null;
        $draft=is_string($raw) ? json_decode($raw,true) : null;
        if (! is_array($draft) || ! in_array($draft['kind'] ?? null,['task','meeting','clarification'],true)) return response()->json(['message'=>'The assistant returned an unreadable draft. Please rephrase and try again.'],502);
        $draft['timezone']=$timezone;
        if (($draft['kind'] ?? '')==='meeting' && !empty($draft['location_type']) && $draft['location_type']==='saved_place') {
            $place=$places->first(fn($p)=>mb_strtolower($p->name)===mb_strtolower((string)($draft['location_label'] ?? '')));
            $draft['saved_place_id']=$place?->id;
        }
        return response()->json(['draft'=>$draft]);
    }

    public function ask(Request $request)
    {
        $data=$request->validate([
            'message'=>['required','string','max:2000'],
            'input_language'=>['sometimes','in:en-IN,hi-IN'],
            'history'=>['sometimes','array','max:10'],
            'history.*.role'=>['required','in:user,assistant'],
            'history.*.content'=>['required','string','max:2000'],
        ]);
        $user=$request->user();
        $timezone=$this->userTimezone($user);
        $key=config('taskflow.ai.api_key');
        if(!$key)return response()->json(['message'=>'The AI assistant is not configured yet. Add OPENAI_API_KEY to the API .env file, then restart Laravel.'],422);

        $today=now($timezone)->toDateString();
        $agenda=$this->todaySchedule($user);
        $name=$user->preferences?->assistant_name ?: 'Kriyabot Assistant';
        $language = ($data['input_language'] ?? 'en-IN') === 'hi-IN' ? 'Hindi (Devanagari)' : 'Indian English';
        $system="You are {$name}, a warm, respectful, practical personal assistant and supportive companion for {$user->name}. Be friendly without claiming to be human, a real friend, or to have feelings. Reply in {$language}, matching that language for speech-friendly answers. Use the user's timezone {$timezone}. Today's date is {$today}. Today's Kriyabot schedule (only use this data for their schedule): ".json_encode($agenda,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES).". If it is empty, say they have no special schedule currently saved and they can enjoy a free day or add plans. Help with research and comparisons; use current web search for anything time-sensitive or when asked to search. Be transparent about uncertainty and never fabricate sources. Do not say you saved/changed tasks or meetings; task creation is available in the dedicated assistant planner. Keep answers concise and conversational.";
        $history=collect($data['history'] ?? [])->map(fn($item)=>['role'=>$item['role'],'content'=>$item['content']]);
        $input=[['role'=>'developer','content'=>$system],...$history->all(),['role'=>'user','content'=>$data['message']]];
        try{
            $response=Http::withToken($key)->timeout(45)->post('https://api.openai.com/v1/responses',[
                'model'=>config('taskflow.ai.model','gpt-4.1-mini'),
                'store'=>false,
                'tools'=>[['type'=>'web_search']],
                'input'=>$input,
            ]);
        }catch(ConnectionException $e){Log::error('Kriyabot AI chat connection failed',['error'=>$e->getMessage()]);return response()->json(['message'=>'The API server could not connect securely to the AI service. Check the server TLS certificate trust, DNS, and outbound HTTPS.'],502);}
        catch(\Throwable $e){Log::error('Kriyabot AI chat failed',['type'=>get_class($e),'error'=>$e->getMessage()]);return response()->json(['message'=>'The AI service could not answer this request. Check the API server log for details.'],502);}
        if(!$response->successful()){
            $status=$response->status();$providerMessage=(string)data_get($response->json(),'error.message','');
            Log::warning('Kriyabot AI chat returned an error',['status'=>$status,'provider_message'=>$providerMessage]);
            return response()->json(['message'=>match($status){401=>'The OpenAI API key was rejected. Check the API server key.',403=>'OpenAI denied this request. Check model and web search access.',429=>'The AI service reached its rate or usage limit.',default=>'The AI service returned HTTP '.$status.($providerMessage!==''?': '.$providerMessage:'')}],502);
        }
        $payload=$response->json();$messageItem=collect($payload['output'] ?? [])->first(fn($item)=>($item['type'] ?? '')==='message');
        $content=collect($messageItem['content'] ?? [])->first(fn($item)=>($item['type'] ?? '')==='output_text');
        $text=$content['text'] ?? $payload['output_text'] ?? '';
        $sources=collect($content['annotations'] ?? [])->filter(fn($item)=>($item['type'] ?? '')==='url_citation')
            ->map(fn($item)=>['url'=>$item['url'] ?? null,'title'=>$item['title'] ?? $item['url'] ?? 'Source'])
            ->filter(fn($item)=>is_string($item['url']) && str_starts_with($item['url'],'https://'))->unique('url')->values();
        return response()->json(['answer'=>$text,'sources'=>$sources,'searched'=>collect($payload['output'] ?? [])->contains(fn($item)=>($item['type'] ?? '')==='web_search_call')]);
    }

    private function todaySchedule(User $user): array
    {
        $timezone=$this->userTimezone($user);
        $dayStart=now($timezone)->startOfDay()->utc();
        $dayEnd=now($timezone)->endOfDay()->utc();
        $tasks=Task::where('workspace_id',$user->workspace_id)->where(function(Builder $query)use($dayStart,$dayEnd){
            $query->whereBetween('start_at',[$dayStart,$dayEnd])->orWhereBetween('due_at',[$dayStart,$dayEnd])
                ->orWhere(fn(Builder $overlap)=>$overlap->whereNotNull('start_at')->whereNotNull('due_at')->where('start_at','<=',$dayEnd)->where('due_at','>=',$dayStart))
                ->orWhere(fn(Builder $overdue)=>$overdue->whereNotNull('due_at')->where('due_at','<',$dayStart)->whereNotIn('status',['done','cancelled']));
        });
        if(!$user->hasRole('workspace_owner'))$tasks->where(fn(Builder $q)=>$q->where('created_by',$user->id)->orWhereHas('assignees',fn(Builder $a)=>$a->where('users.id',$user->id))->orWhereHas('project.members',fn(Builder $m)=>$m->where('users.id',$user->id)));
        $agenda=$tasks->with('project:id,name')->get()->map(fn(Task $task)=>[
            'id'=>'task-'.$task->id,'start_at'=>$task->start_at?->timezone($timezone)->toIso8601String() ?? $task->due_at?->timezone($timezone)->toIso8601String(),
            'title'=>$task->title,'kind'=>'task','phase'=>$task->status==='done'?'completed':'plan','overdue'=>$task->due_at && $task->due_at->lt(now($timezone)->startOfDay()),'detail'=>$task->project?->name ?? 'Personal task','status'=>$task->status,
        ])->all();
        $meetings=Meeting::where('workspace_id',$user->workspace_id)->where('created_by',$user->id)->where('status','scheduled')->whereBetween('starts_at',[$dayStart,$dayEnd])->get();
        foreach($meetings as $meeting)$agenda[]=['id'=>'meeting-'.$meeting->id,'start_at'=>$meeting->starts_at->timezone($meeting->timezone)->toIso8601String(),'title'=>$meeting->title,'kind'=>'meeting','phase'=>'plan','detail'=>$meeting->attendee_name ? 'With '.$meeting->attendee_name.' · '.($meeting->location_label ?? ucfirst($meeting->location_type)) : ($meeting->location_label ?? ucfirst($meeting->location_type)),'status'=>'scheduled'];
        usort($agenda,fn($a,$b)=>($a['start_at'] ?? '') <=> ($b['start_at'] ?? ''));
        return $agenda;
    }

    private function userTimezone(User $user): string
    {
        $timezone=$user->timezone ?: config('app.timezone');
        return in_array($timezone,['Asia/Calcutta','Asia/Kolkatta'],true)?'Asia/Kolkata':$timezone;
    }
}
