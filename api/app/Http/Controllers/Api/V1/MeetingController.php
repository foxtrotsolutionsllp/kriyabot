<?php
namespace App\Http\Controllers\Api\V1;
use App\Http\Controllers\Controller;
use App\Models\Meeting;
use App\Models\SavedPlace;
use App\Models\TaskflowReminder;
use App\Services\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Support\Carbon;

class MeetingController extends Controller
{
    public function index(Request $request){return response()->json(Meeting::where('workspace_id',$request->user()->workspace_id)->where('created_by',$request->user()->id)->whereBetween('starts_at',[$request->query('from',now()->subDays(30)), $request->query('to',now()->addMonths(6))])->orderBy('starts_at')->get());}
    public function store(Request $request, AuditLogger $audit)
    {
        $user=$request->user(); $d=$request->validate(['title'=>['required','string','max:240'],'description'=>['nullable','string','max:10000'],'attendee_name'=>['nullable','string','max:180'],'starts_at'=>['required','date'],'ends_at'=>['required','date','after:starts_at'],'timezone'=>['required','timezone'],'location_type'=>['required',Rule::in(['office','saved_place','online','custom'])],'location_label'=>['nullable','string','max:180'],'location_details'=>['nullable','string','max:2000'],'online_url'=>['nullable','url','max:2000'],'saved_place_id'=>['nullable','integer',Rule::exists('saved_places','id')->where(fn($q)=>$q->where('workspace_id',$user->workspace_id)->where('user_id',$user->id))],'reminder_minutes'=>['nullable','integer','min:0','max:10080']]);
        $d['starts_at']=Carbon::parse($d['starts_at'])->utc();$d['ends_at']=Carbon::parse($d['ends_at'])->utc();
        if($d['location_type']==='saved_place'){$place=SavedPlace::where('workspace_id',$user->workspace_id)->where('user_id',$user->id)->findOrFail($d['saved_place_id'] ?? 0);$d['location_label']=$place->name;$d['location_details']=$place->address;}else{$d['saved_place_id']=null;}
        if($d['location_type']==='online' && empty($d['online_url'])) return response()->json(['message'=>'Add the meeting link.'],422);
        if($d['location_type']==='office' && empty($d['location_label'])) $d['location_label']='Office';
        $meeting=DB::transaction(function()use($d,$user){$meeting=Meeting::create([...collect($d)->except(['reminder_minutes'])->all(),'workspace_id'=>$user->workspace_id,'created_by'=>$user->id]);if(($d['reminder_minutes']??null)!==null){$reminder=TaskflowReminder::create(['workspace_id'=>$user->workspace_id,'user_id'=>$user->id,'remind_at'=>$meeting->starts_at->copy()->subMinutes($d['reminder_minutes']),'status'=>'pending']);$reminder->remindable()->associate($meeting);$reminder->save();}return $meeting;});
        $audit->record($request,'meeting.created',$meeting,['starts_at'=>$meeting->starts_at]); return response()->json($meeting,201);
    }
    public function destroy(Request $request, Meeting $meeting, AuditLogger $audit){abort_unless($meeting->workspace_id===$request->user()->workspace_id && $meeting->created_by===$request->user()->id,404);$audit->record($request,'meeting.cancelled',$meeting);$meeting->update(['status'=>'cancelled']);$meeting->delete();return response()->noContent();}
}
