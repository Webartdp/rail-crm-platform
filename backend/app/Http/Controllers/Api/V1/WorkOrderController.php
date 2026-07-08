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
        $details = [
            'leistungsart' => $request->input('leistungsart'),
            'zugnummer' => $request->input('zugnummer'),
            'einsatzort' => $request->input('einsatzort'),
        ];

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
}
