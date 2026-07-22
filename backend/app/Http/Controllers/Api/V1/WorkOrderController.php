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
        $query = DB::table('work_orders')->orderByDesc('id')->limit(100);

        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->input('employee_id'));
        }

        return response()->json(['data' => $query->get()]);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $user = CurrentUser::fromRequest($request);

        if (!CurrentUser::hasRole($user, ['manager', 'admin'])) {
            return response()->json(['message' => 'Only manager or admin can view work order details.'], 403);
        }

        $workOrder = DB::table('work_orders')->where('id', $id)->first();

        if (!$workOrder) {
            return response()->json(['message' => 'Work order not found.'], 404);
        }

        return response()->json(['data' => $workOrder]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = CurrentUser::fromRequest($request);

        if (!CurrentUser::hasRole($user, ['manager', 'admin'])) {
            return response()->json(['message' => 'Only manager or admin can create work orders.'], 403);
        }

        $title = trim((string) $request->input('title', ''));

        if ($title === '') {
            return response()->json([
                'message' => 'Work order title is required.',
                'errors' => ['title' => ['Title is required.']],
            ], 422);
        }

        $now = now();

        $details = $this->detailsFromRequest($request, $title);

        $id = DB::table('work_orders')->insertGetId([
            'employee_id' => $request->input('employee_id'),
            'title' => $title,
            'reference_number' => $request->input('reference_number'),
            'status' => $request->input('status', 'planned'),
            'planned_start_at' => $request->input('planned_start_at'),
            'planned_end_at' => $request->input('planned_end_at'),
            'details' => json_encode($details),
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        DB::table('audit_logs')->insert([
            'user_id' => $user->id,
            'employee_id' => $request->input('employee_id'),
            'action' => 'work_order_created',
            'entity_type' => 'work_order',
            'entity_id' => $id,
            'payload' => json_encode(['title' => $title]),
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        return response()->json([
            'message' => 'Work order created.',
            'data' => DB::table('work_orders')->where('id', $id)->first(),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $user = CurrentUser::fromRequest($request);

        if (!CurrentUser::hasRole($user, ['manager', 'admin'])) {
            return response()->json(['message' => 'Only manager or admin can update work orders.'], 403);
        }

        $workOrder = DB::table('work_orders')->where('id', $id)->first();

        if (!$workOrder) {
            return response()->json(['message' => 'Work order not found.'], 404);
        }

        $title = trim((string) $request->input('title', ''));

        if ($title === '') {
            return response()->json([
                'message' => 'Work order title is required.',
                'errors' => ['title' => ['Title is required.']],
            ], 422);
        }

        $now = now();

        DB::table('work_orders')->where('id', $id)->update([
            'employee_id' => $request->input('employee_id'),
            'title' => $title,
            'reference_number' => $request->input('reference_number'),
            'status' => $request->input('status', $workOrder->status ?: 'planned'),
            'planned_start_at' => $request->input('planned_start_at'),
            'planned_end_at' => $request->input('planned_end_at'),
            'details' => json_encode($this->detailsFromRequest($request, $title)),
            'updated_at' => $now,
        ]);

        DB::table('audit_logs')->insert([
            'user_id' => $user->id,
            'employee_id' => $request->input('employee_id'),
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
            'message' => 'Work order updated.',
            'data' => DB::table('work_orders')->where('id', $id)->first(),
        ]);
    }


    public function destroy(Request $request, int $id): JsonResponse
    {
        $user = CurrentUser::fromRequest($request);

        if (!CurrentUser::hasRole($user, ['manager', 'admin'])) {
            return response()->json(['message' => 'Only manager or admin can delete work orders.'], 403);
        }

        $workOrder = DB::table('work_orders')->where('id', $id)->first();

        if (!$workOrder) {
            return response()->json(['message' => 'Work order not found.'], 404);
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
            'message' => 'Work order deleted.',
        ]);
    }

    public function close(Request $request, int $id): JsonResponse
    {
        $user = CurrentUser::fromRequest($request);

        if (!CurrentUser::hasRole($user, ['manager', 'admin'])) {
            return response()->json(['message' => 'Only manager or admin can close work orders.'], 403);
        }

        $workOrder = DB::table('work_orders')->where('id', $id)->first();

        if (!$workOrder) {
            return response()->json(['message' => 'Work order not found.'], 404);
        }

        if ($workOrder->status === 'closed') {
            return response()->json([
                'message' => 'Work order is already closed.',
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
            'message' => 'Work order closed.',
            'data' => DB::table('work_orders')->where('id', $id)->first(),
        ]);
    }

    private function detailsFromRequest(Request $request, string $title): array
    {
        return [
            'object_name' => $request->input('object_name'),
            'object_address' => $request->input('object_address'),
            'customer_name' => $request->input('customer_name'),
            'work_title' => $request->input('work_title', $title),
            'leistungsart' => $request->input('leistungsart'),
            'zugnummer' => $request->input('zugnummer'),
            'einsatzort' => $request->input('einsatzort'),
        ];
    }
}
