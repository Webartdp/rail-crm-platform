<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** Clients (Auftraggeber) and their objects — master data kept by manager/admin. */
class ClientController extends Controller
{
    public function index(): JsonResponse
    {
        $clients = DB::table('clients')->orderBy('name')->get();
        $objects = DB::table('objects')->orderBy('name')->get()->groupBy('client_id');
        $orderCounts = DB::table('work_orders')->selectRaw('client_id, count(*) as total')->whereNotNull('client_id')->groupBy('client_id')->pluck('total', 'client_id');

        return response()->json([
            'data' => $clients->map(function ($client) use ($objects, $orderCounts) {
                $client->objects = array_values(($objects[$client->id] ?? collect())->all());
                $client->orders_count = (int) ($orderCounts[$client->id] ?? 0);

                return $client;
            }),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $id = DB::table('clients')->insertGetId($data + ['status' => 'active', 'created_at' => now(), 'updated_at' => now()]);

        return response()->json(['message' => __('Client saved.'), 'data' => $this->find($id)], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        if (!DB::table('clients')->where('id', $id)->exists()) {
            return response()->json(['message' => __('Client not found.')], 404);
        }

        $data = $this->validated($request, true);
        DB::table('clients')->where('id', $id)->update($data + ['updated_at' => now()]);

        return response()->json(['message' => __('Client saved.'), 'data' => $this->find($id)]);
    }

    public function destroy(int $id): JsonResponse
    {
        if (DB::table('work_orders')->where('client_id', $id)->exists()) {
            // Keep history intact: clients with work orders are only deactivated.
            DB::table('clients')->where('id', $id)->update(['status' => 'inactive', 'updated_at' => now()]);

            return response()->json(['message' => __('Client has work orders and was deactivated instead of deleted.')]);
        }

        DB::table('objects')->where('client_id', $id)->delete();
        DB::table('clients')->where('id', $id)->delete();

        return response()->json(['message' => __('Client deleted.')]);
    }

    private function validated(Request $request, bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'name' => [$required, 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:255'],
            'contact_person' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'status' => ['sometimes', 'in:active,inactive'],
        ]);
    }

    private function find(int $id): ?object
    {
        $client = DB::table('clients')->where('id', $id)->first();
        if ($client) {
            $client->objects = DB::table('objects')->where('client_id', $id)->orderBy('name')->get();
        }

        return $client;
    }
}
