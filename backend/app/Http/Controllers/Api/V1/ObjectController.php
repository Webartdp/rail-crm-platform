<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** Work objects of a client. The object address is the Einsatzort. */
class ObjectController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = DB::table('objects')
            ->leftJoin('clients', 'clients.id', '=', 'objects.client_id')
            ->select('objects.*', 'clients.name as client_name')
            ->orderBy('objects.name');

        if ($request->filled('client_id')) {
            $query->where('objects.client_id', (int) $request->input('client_id'));
        }

        return response()->json(['data' => $query->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $id = DB::table('objects')->insertGetId($data + ['location' => $data['address'] ?? null, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()]);

        return response()->json(['message' => __('Object saved.'), 'data' => DB::table('objects')->where('id', $id)->first()], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        if (!DB::table('objects')->where('id', $id)->exists()) {
            return response()->json(['message' => __('Object not found.')], 404);
        }

        $data = $this->validated($request, true);
        if (array_key_exists('address', $data)) {
            $data['location'] = $data['address'];
        }
        DB::table('objects')->where('id', $id)->update($data + ['updated_at' => now()]);

        // Keep the denormalised names in open work orders in sync.
        $object = DB::table('objects')->where('id', $id)->first();
        foreach (DB::table('work_orders')->where('object_id', $id)->whereNotIn('status', ['invoiced', 'closed'])->get() as $order) {
            $details = json_decode((string) $order->details, true) ?: [];
            $details['object_name'] = $object->name;
            $details['object_address'] = $object->address;
            $details['einsatzort'] = $object->address;
            DB::table('work_orders')->where('id', $order->id)->update(['details' => json_encode($details, JSON_UNESCAPED_UNICODE)]);
        }

        return response()->json(['message' => __('Object saved.'), 'data' => $object]);
    }

    public function destroy(int $id): JsonResponse
    {
        if (DB::table('work_orders')->where('object_id', $id)->exists()) {
            DB::table('objects')->where('id', $id)->update(['status' => 'inactive', 'updated_at' => now()]);

            return response()->json(['message' => __('Object has work orders and was deactivated instead of deleted.')]);
        }

        DB::table('objects')->where('id', $id)->delete();

        return response()->json(['message' => __('Object deleted.')]);
    }

    private function validated(Request $request, bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'client_id' => [$required, 'integer', 'exists:clients,id'],
            'name' => [$required, 'string', 'max:255'],
            'address' => [$partial ? 'sometimes' : 'required', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'status' => ['sometimes', 'in:active,inactive'],
        ]);
    }
}
