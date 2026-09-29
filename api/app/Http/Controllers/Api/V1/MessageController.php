<?php
namespace App\Http\Controllers\Api\V1;
use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class MessageController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $conversations = Conversation::where('workspace_id', $user->workspace_id)->whereHas('members', fn ($q) => $q->where('users.id', $user->id))->with(['members:id,name,email,profile_visibility', 'messages' => fn ($q) => $q->latest()->limit(1), 'messages.sender:id,name'])->orderByDesc('updated_at')->get();
        return response()->json($conversations->map(function (Conversation $conversation) use ($user) {
            $member = DB::table('conversation_members')->where('conversation_id', $conversation->id)->where('user_id', $user->id)->first();
            $peer = $conversation->members->firstWhere('id', '!=', $user->id);
            $last = $conversation->messages->first();
            $unread = Message::where('conversation_id', $conversation->id)->where('sender_id', '!=', $user->id)->when($member?->last_read_at, fn ($q, $at) => $q->where('created_at', '>', $at))->count();
            return ['id' => $conversation->id, 'person' => $peer ? ['id' => $peer->id, 'name' => $peer->name, 'email' => $peer->profile_visibility === 'private' ? null : $peer->email] : null, 'last_message' => $last ? ['body' => $last->body, 'created_at' => $last->created_at, 'sender_id' => $last->sender_id] : null, 'unread_count' => $unread];
        }));
    }

    public function startDirect(Request $request, AuditLogger $audit)
    {
        $data = $request->validate(['participant_id' => ['required', 'integer']]);
        $user = $request->user();
        if ((int) $data['participant_id'] === (int) $user->id) throw ValidationException::withMessages(['participant_id' => ['You cannot start a conversation with yourself.']]);
        $person = User::where('workspace_id', $user->workspace_id)->where('status', 'active')->where('approval_status', 'approved')->findOrFail($data['participant_id']);
        $key = min($user->id, $person->id).':'.max($user->id, $person->id);
        $conversation = Conversation::where('workspace_id', $user->workspace_id)->where('direct_key', $key)->first();
        if (! $conversation) {
            abort_if($person->profile_visibility === 'private', 403, 'This profile is not accepting new conversations.');
            try {
                $conversation = DB::transaction(function () use ($user, $person, $key) {
                    $conversation = Conversation::create(['workspace_id' => $user->workspace_id, 'created_by' => $user->id, 'type' => 'direct', 'direct_key' => $key]);
                    $conversation->members()->attach([$user->id => ['workspace_id' => $user->workspace_id], $person->id => ['workspace_id' => $user->workspace_id]]);
                    return $conversation;
                });
                $audit->record($request, 'message.conversation_started', $conversation, ['participant_id' => $person->id]);
            } catch (\Illuminate\Database\UniqueConstraintViolationException $exception) {
                $conversation = Conversation::where('workspace_id', $user->workspace_id)->where('direct_key', $key)->firstOrFail();
            }
        }
        return response()->json(['id' => $conversation->id, 'person' => ['id' => $person->id, 'name' => $person->name]], 201);
    }

    public function messages(Request $request, Conversation $conversation)
    {
        $user = $request->user();
        abort_unless((int) $conversation->workspace_id === (int) $user->workspace_id && $conversation->members()->where('users.id', $user->id)->exists(), 404);
        DB::table('conversation_members')->where('conversation_id', $conversation->id)->where('user_id', $user->id)->update(['last_read_at' => now(), 'updated_at' => now()]);
        $messages = $conversation->messages()->with('sender:id,name')->orderBy('created_at')->orderBy('id')->limit(100)->get();
        $messages->each(fn (Message $message) => $message->setAttribute('is_mine', (int) $message->sender_id === (int) $user->id));
        return response()->json($messages);
    }

    public function send(Request $request, Conversation $conversation, AuditLogger $audit)
    {
        $user = $request->user();
        abort_unless((int) $conversation->workspace_id === (int) $user->workspace_id && $conversation->members()->where('users.id', $user->id)->exists(), 404);
        $data = $request->validate(['body' => ['required', 'string', 'max:5000']]);
        $message = $conversation->messages()->create(['workspace_id' => $user->workspace_id, 'sender_id' => $user->id, 'body' => trim($data['body'])]);
        $conversation->touch();
        $audit->record($request, 'message.sent', $message, ['conversation_id' => $conversation->id]);
        return response()->json($message->load('sender:id,name'), 201);
    }
}
