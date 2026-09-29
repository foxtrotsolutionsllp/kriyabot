<?php
namespace App\Http\Controllers\Api\V1;
use App\Http\Controllers\Controller;
use App\Models\SavedPlace;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
class SavedPlaceController extends Controller {
    public function store(Request $r){$d=$r->validate(['name'=>['required','string','max:120'],'kind'=>['required',Rule::in(['office','custom'])],'address'=>['nullable','string','max:500']]);$p=SavedPlace::create([...$d,'workspace_id'=>$r->user()->workspace_id,'user_id'=>$r->user()->id]);return response()->json($p,201);}
    public function destroy(Request $r,SavedPlace $place){abort_unless($place->workspace_id===$r->user()->workspace_id && $place->user_id===$r->user()->id,404);$place->delete();return response()->noContent();}
}
