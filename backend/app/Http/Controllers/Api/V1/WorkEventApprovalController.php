<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Support\CurrentUser;
use App\Support\TimeLedger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WorkEventApprovalController extends Controller
{
    private array $pairs = [
        'gasfahrt_start' => ['stop' => 'gasfahrt_stop', 'type' => 'gasfahrt'],
        'dienstbeginn' => ['stop' => 'arbeit_stop', 'type' => 'arbeit'],
        'dienstfahrt_start' => ['stop' => 'dienstfahrt_stop', 'type' => 'dienstfahrt'],
    ];

    public function index(): JsonResponse
    {
        TimeLedger::syncApprovals();

        // Attach the ledger view: minutes, employee note and whether the employee corrected the time.
        $pairs = [];
        foreach (TimeLedger::pairs() as $pair) {
            if ($pair['approval_id']) {
                $pairs[$pair['approval_id']] = $pair;
            }
        }

        $rows = DB::table('work_event_approvals')->orderByDesc('id')->limit(300)->get()->map(function ($row) use ($pairs) {
            $pair = $pairs[$row->id] ?? null;
            $row->minutes = $pair['minutes'] ?? null;
            $row->bemerkung = $pair['bemerkung'] ?? null;
            $row->corrected = $pair['corrected'] ?? false;
            $row->original_start_time = $pair['original_start_time'] ?? null;
            $row->original_stop_time = $pair['original_stop_time'] ?? null;

            return $row;
        });

        return response()->json(['data' => $rows]);
    }

    public function approve(Request $request, int $id): JsonResponse
    {
        return $this->setStatusById($request, $id, 'approved');
    }

    public function reject(Request $request, int $id): JsonResponse
    {
        return $this->setStatusById($request, $id, 'rejected');
    }

    private function setStatusById(Request $request, int $id, string $status): JsonResponse
    {
        $user = CurrentUser::fromRequest($request);
        if (!CurrentUser::hasRole($user, ['manager', 'admin'])) {
            return response()->json(['message' => __('Only manager or admin can approve work event pairs.')], 403);
        }

        $approval = DB::table('work_event_approvals')->where('id', $id)->first();

        if (!$approval) {
            return response()->json(['message' => __('Approval not found.')], 404);
        }

        $now = now();
        DB::table('work_event_approvals')->where('id', $id)->update([
            'status' => $status,
            'approved_by' => $user->id,
            'approved_at' => $status === 'approved' ? $now : null,
            'comment' => $request->input('comment'),
            'updated_at' => $now,
        ]);

        $this->recalculateWorkOrderStatus((int) $approval->assignment_id, $now);

        DB::table('audit_logs')->insert([
            'user_id' => $user->id,
            'employee_id' => $approval->employee_id,
            'action' => 'work_event_'.$status,
            'entity_type' => 'work_event_approval',
            'entity_id' => $id,
            'payload' => json_encode(['approval_id' => $id]),
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        return response()->json([
            'message' => $status === 'approved' ? __('Work event pair approved.') : __('Work event pair rejected.'),
            'data' => DB::table('work_event_approvals')->where('id', $id)->first(),
        ]);
    }

    private function recalculateWorkOrderStatus(int $assignmentId, $now): void
    {
        $approvals = DB::table('work_event_approvals')
            ->where('assignment_id', $assignmentId)
            ->get();

        if ($approvals->isEmpty()) {
            return;
        }

        $hasRejected = $approvals->contains(fn ($approval) => $approval->status === 'rejected');
        $hasPending = $approvals->contains(fn ($approval) => $approval->status === 'pending');

        if ($hasRejected) {
            $status = 'rejected';
        } elseif ($hasPending) {
            $status = 'waiting_approval';
        } else {
            $status = 'approved';
        }

        DB::table('work_orders')->where('id', $assignmentId)->update([
            'status' => $status,
            'updated_at' => $now,
        ]);
    }
}
