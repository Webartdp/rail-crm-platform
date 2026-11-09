<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Support\CurrentUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WorkOrderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = DB::table('work_orders')->orderByDesc('planned_start_at')->orderByDesc('id')->limit(1000);

        $employeeId = CurrentUser::isEmployee($request)
            ? (CurrentUser::actingEmployeeId($request) ?? -1)
            : ($request->filled('employee_id') ? (int) $request->input('employee_id') : null);

        if ($employeeId !== null) {
            $query->where(function ($where) use ($employeeId) {
                $where->where('employee_id', $employeeId)
                    ->orWhereIn('id', DB::table('work_order_employees')->select('work_order_id')->where('employee_id', $employeeId));
            });
        }
        if ($request->filled('client_id')) {
            $query->where('client_id', (int) $request->input('client_id'));
        }
        if ($request->filled('date_from')) {
            $query->where('planned_start_at', '>=', $request->input('date_from').' 00:00:00');
        }
        if ($request->filled('date_to')) {
            $query->where('planned_start_at', '<=', $request->input('date_to').' 23:59:59');
        }

        return response()->json(['data' => $this->withEmployees($query->get())]);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $user = CurrentUser::fromRequest($request);

        if (!CurrentUser::hasRole($user, ['manager', 'admin'])) {
            return response()->json(['message' => __('Only manager or admin can view work order details.')], 403);
        }

        $workOrder = DB::table('work_orders')->where('id', $id)->first();

        if (!$workOrder) {
            return response()->json(['message' => __('Work order not found.')], 404);
        }

        return response()->json(['data' => $this->withEmployees(collect([$workOrder]))->first()]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = CurrentUser::fromRequest($request);

        if (!CurrentUser::hasRole($user, ['manager', 'admin'])) {
            return response()->json(['message' => __('Only manager or admin can create work orders.')], 403);
        }

        $data = $this->validatedOrder($request);
        if ($data instanceof JsonResponse) {
            return $data;
        }
        $title = $data['title'];
        $now = now();

        $id = DB::table('work_orders')->insertGetId([
            'client_id' => $data['client_id'],
            'object_id' => $data['object_id'],
            'employee_id' => $data['employee_ids'][0],
            'title' => $title,
            'reference_number' => $data['reference_number'] ?? null,
            'status' => $data['status'] ?? 'planned',
            'planned_start_at' => $data['planned_start_at'],
            'planned_end_at' => $data['planned_end_at'],
            'details' => json_encode($this->details($data), JSON_UNESCAPED_UNICODE),
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        $this->syncEmployees($id, $data['employee_ids']);

        DB::table('audit_logs')->insert([
            'user_id' => $user->id,
            'employee_id' => $data['employee_ids'][0],
            'action' => 'work_order_created',
            'entity_type' => 'work_order',
            'entity_id' => $id,
            'payload' => json_encode(['title' => $title]),
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        return response()->json([
            'message' => __('Work order created.'),
            'data' => $this->withEmployees(DB::table('work_orders')->where('id', $id)->get())->first(),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $user = CurrentUser::fromRequest($request);

        if (!CurrentUser::hasRole($user, ['manager', 'admin'])) {
            return response()->json(['message' => __('Only manager or admin can update work orders.')], 403);
        }

        $workOrder = DB::table('work_orders')->where('id', $id)->first();

        if (!$workOrder) {
            return response()->json(['message' => __('Work order not found.')], 404);
        }

        $data = $this->validatedOrder($request);
        if ($data instanceof JsonResponse) {
            return $data;
        }
        $now = now();

        DB::table('work_orders')->where('id', $id)->update([
            'client_id' => $data['client_id'],
            'object_id' => $data['object_id'],
            'employee_id' => $data['employee_ids'][0],
            'title' => $data['title'],
            'reference_number' => $data['reference_number'] ?? null,
            'status' => $data['status'] ?? ($workOrder->status ?: 'planned'),
            'planned_start_at' => $data['planned_start_at'],
            'planned_end_at' => $data['planned_end_at'],
            'details' => json_encode($this->details($data), JSON_UNESCAPED_UNICODE),
            'updated_at' => $now,
        ]);
        $this->syncEmployees($id, $data['employee_ids']);

        DB::table('audit_logs')->insert([
            'user_id' => $user->id,
            'employee_id' => $data['employee_ids'][0],
            'action' => 'work_order_updated',
            'entity_type' => 'work_order',
            'entity_id' => $id,
            'payload' => json_encode([
                'previous_status' => $workOrder->status,
                'new_status' => $request->input('status', $workOrder->status),
            ]),
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        return response()->json([
            'message' => __('Work order updated.'),
            'data' => $this->withEmployees(DB::table('work_orders')->where('id', $id)->get())->first(),
        ]);
    }


    public function destroy(Request $request, int $id): JsonResponse
    {
        $user = CurrentUser::fromRequest($request);

        if (!CurrentUser::hasRole($user, ['manager', 'admin'])) {
            return response()->json(['message' => __('Only manager or admin can delete work orders.')], 403);
        }

        $workOrder = DB::table('work_orders')->where('id', $id)->first();

        if (!$workOrder) {
            return response()->json(['message' => __('Work order not found.')], 404);
        }

        $now = now();

        DB::transaction(function () use ($id, $user, $workOrder, $now) {
            $eventIds = DB::table('work_events')
                ->where('assignment_id', $id)
                ->pluck('id')
                ->map(fn ($eventId) => (int) $eventId)
                ->all();

            $approvalIds = DB::table('work_event_approvals')
                ->where('assignment_id', $id)
                ->pluck('id')
                ->map(fn ($approvalId) => (int) $approvalId)
                ->all();

            if ($eventIds !== []) {
                DB::table('audit_logs')
                    ->where('entity_type', 'work_event')
                    ->whereIn('entity_id', $eventIds)
                    ->delete();
            }

            if ($approvalIds !== []) {
                DB::table('audit_logs')
                    ->where('entity_type', 'work_event_approval')
                    ->whereIn('entity_id', $approvalIds)
                    ->delete();
            }

            DB::table('work_event_approvals')->where('assignment_id', $id)->delete();
            DB::table('work_events')->where('assignment_id', $id)->delete();
            DB::table('work_order_employees')->where('work_order_id', $id)->delete();
            DB::table('work_orders')->where('id', $id)->delete();

            DB::table('audit_logs')->insert([
                'user_id' => $user->id,
                'employee_id' => $workOrder->employee_id,
                'action' => 'work_order_deleted',
                'entity_type' => 'work_order',
                'entity_id' => $id,
                'payload' => json_encode([
                    'reference_number' => $workOrder->reference_number,
                    'title' => $workOrder->title,
                    'status' => $workOrder->status,
                ]),
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        });

        return response()->json([
            'message' => __('Work order deleted.'),
        ]);
    }

    public function close(Request $request, int $id): JsonResponse
    {
        $user = CurrentUser::fromRequest($request);

        if (!CurrentUser::hasRole($user, ['manager', 'admin'])) {
            return response()->json(['message' => __('Only manager or admin can close work orders.')], 403);
        }

        $workOrder = DB::table('work_orders')->where('id', $id)->first();

        if (!$workOrder) {
            return response()->json(['message' => __('Work order not found.')], 404);
        }

        if ($workOrder->status === 'closed') {
            return response()->json([
                'message' => __('Work order is already closed.'),
                'data' => $workOrder,
            ]);
        }

        $now = now();

        DB::table('work_orders')->where('id', $id)->update([
            'status' => 'closed',
            'updated_at' => $now,
        ]);

        DB::table('audit_logs')->insert([
            'user_id' => $user->id,
            'employee_id' => $workOrder->employee_id,
            'action' => 'work_order_closed',
            'entity_type' => 'work_order',
            'entity_id' => $id,
            'payload' => json_encode([
                'previous_status' => $workOrder->status,
                'closed_from' => $request->input('source', 'manual'),
            ]),
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        return response()->json([
            'message' => __('Work order closed.'),
            'data' => DB::table('work_orders')->where('id', $id)->first(),
        ]);
    }

    /** @return array<string, mixed>|JsonResponse */
    private function validatedOrder(Request $request): array|JsonResponse
    {
        // Older clients send a single employee_id.
        if (!$request->has('employee_ids') && $request->filled('employee_id')) {
            $request->merge(['employee_ids' => [(int) $request->input('employee_id')]]);
        }

        $data = $request->validate([
            'client_id' => ['required', 'integer', 'exists:clients,id'],
            'object_id' => ['required', 'integer', 'exists:objects,id'],
            'employee_ids' => ['required', 'array', 'min:1'],
            'employee_ids.*' => ['integer', 'exists:employee_profiles,id'],
            'title' => ['required', 'string', 'max:255'],
            'reference_number' => ['nullable', 'string', 'max:255'],
            'leistungsart' => ['nullable', 'string', 'max:100'],
            'zugnummer' => ['nullable', 'string', 'max:100'],
            'planned_start_at' => ['required', 'date'],
            'planned_end_at' => ['required', 'date', 'after:planned_start_at'],
            'status' => ['sometimes', 'in:planned,in_progress,waiting_approval,approved,rejected,invoiced,closed,cancelled'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ]);

        $object = DB::table('objects')->where('id', $data['object_id'])->first();
        if ((int) $object->client_id !== (int) $data['client_id']) {
            return response()->json([
                'message' => __('The object does not belong to this client.'),
                'errors' => ['object_id' => [__('The object does not belong to this client.')]],
            ], 422);
        }

        $data['employee_ids'] = array_values(array_unique(array_map('intval', $data['employee_ids'])));
        $data['planned_start_at'] = date('Y-m-d H:i:s', strtotime($data['planned_start_at']));
        $data['planned_end_at'] = date('Y-m-d H:i:s', strtotime($data['planned_end_at']));
        $data['object'] = $object;
        $data['client'] = DB::table('clients')->where('id', $data['client_id'])->first();

        return $data;
    }

    /** Names are copied into details so existing screens and history keep working. */
    private function details(array $data): array
    {
        return [
            'object_name' => $data['object']->name,
            'object_address' => $data['object']->address,
            'customer_name' => $data['client']->name,
            'work_title' => $data['title'],
            'leistungsart' => $data['leistungsart'] ?? null,
            'zugnummer' => $data['zugnummer'] ?? null,
            'einsatzort' => $data['object']->address,
            'notes' => $data['notes'] ?? null,
        ];
    }

    private function syncEmployees(int $orderId, array $employeeIds): void
    {
        DB::table('work_order_employees')->where('work_order_id', $orderId)->whereNotIn('employee_id', $employeeIds)->delete();
        $now = now();
        foreach ($employeeIds as $employeeId) {
            DB::table('work_order_employees')->insertOrIgnore([
                'work_order_id' => $orderId,
                'employee_id' => $employeeId,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    private function withEmployees($orders)
    {
        $ids = $orders->pluck('id')->all();
        $assigned = $ids === [] ? collect() : DB::table('work_order_employees')->whereIn('work_order_id', $ids)->get()->groupBy('work_order_id');

        return $orders->map(function ($order) use ($assigned) {
            $employeeIds = ($assigned[$order->id] ?? collect())->pluck('employee_id')->map(fn ($id) => (int) $id)->all();
            if ($employeeIds === [] && $order->employee_id) {
                $employeeIds = [(int) $order->employee_id];
            }
            $order->employee_ids = $employeeIds;

            return $order;
        });
    }
}
