<?php
namespace App\Http\Controllers\Api\V1;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
class PeopleController extends Controller
{
    public function index(Request $request)
    {
        $data = $request->validate(['q' => ['nullable', 'string', 'max:100']]);
        $user = $request->user();
        $query = User::where('workspace_id', $user->workspace_id)->where('status', 'active')->where('approval_status', 'approved')
            ->where(fn ($q) => $q->where('profile_visibility', '!=', 'private')->orWhere('id', $user->id));
        if (!empty($data['q'])) $query->where('name', 'like', '%'.$data['q'].'%');
        return response()->json($query->orderBy('name')->get(['id', 'name', 'email', 'timezone', 'locale', 'profile_visibility'])->map(fn (User $person) => [...$person->only(['id', 'name', 'timezone', 'locale']), 'email' => $person->profile_visibility === 'private' && $person->id !== $user->id ? null : $person->email, 'is_self' => $person->id === $user->id]));
    }
}
