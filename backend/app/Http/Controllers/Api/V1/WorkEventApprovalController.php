<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
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
        $this->syncPendingApprovals();

        return response()->json([
            'data' => DB::table('work_event_approvals')->orderByDesc('id')->limit(200)->get(),
        ]);
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
        $approval = DB::table('work_event_approvals')->where('id', $id)->first();

        if (!$approval) {
            return response()->json(['message' => 'Approval not found.'], 404);
        }

        $now = now();
        DB::table('work_event_approvals')->where('id', $id)->update([
            'status' => $status,
            'approved_by' => $request->input('approved_by'),
            'approved_at' => $status === 'approved' ? $now : null,
            'comment' => $request->input('comment'),
            'updated_at' => $now,
        ]);

        $this->updateWorkOrderStatus($approval->assignment_id, $status, $now);

        DB::table('audit_logs')->insert([
            'user_id' => $request->input('approved_by'),
            'employee_id' => $approval->employee_id,
            'action' => 'work_event_'.$status,
            'entity_type' => 'work_event_approval',
            'entity_id' => $id,
            'payload' => json_encode(['approval_id' => $id]),
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        return response()->json([
            'message' => 'Work event pair '.$status.'.',
            'data' => DB::table('work_event_approvals')->where('id', $id)->first(),
        ]);
    }

    private function updateWorkOrderStatus(int $assignmentId, string $approvalStatus, $now): void
    {
        $status = $approvalStatus === 'approved' ? 'approved' : 'waiting_approval';

        DB::table('work_orders')->where('id', $assignmentId)->update([
            'status' => $status,
            'updated_at' => $now,
        ]);
    }

    private function syncPendingApprovals(): void
    {
        foreach ($this->completedPairs() as $item) {
            $exists = DB::table('work_event_approvals')
                ->where('employee_id', $item['employee_id'])
                ->where('assignment_id', $item['assignment_id'])
                ->where('pair_type', $item['pair_type'])
                ->where('start_time', $item['start_time'])
                ->where('stop_time', $item['stop_time'])
                ->exists();

            if ($exists) {
                continue;
            }

            $now = now();
            DB::table('work_event_approvals')->insert([
                'employee_id' => $item['employee_id'],
                'assignment_id' => $item['assignment_id'],
                'pair_type' => $item['pair_type'],
                'start_time' => $item['start_time'],
                'stop_time' => $item['stop_time'],
                'status' => 'pending',
                'comment' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    private function completedPairs(): array
    {
        $events = DB::table('work_events')
            ->whereIn('event_type', ['gasfahrt_start', 'gasfahrt_stop', 'dienstbeginn', 'arbeit_stop', 'dienstfahrt_start', 'dienstfahrt_stop'])
            ->orderBy('employee_id')
            ->orderBy('assignment_id')
            ->orderBy('event_time')
            ->get();

        $open = [];
        $items = [];

        foreach ($events as $event) {
            $key = $event->employee_id.'-'.$event->assignment_id;

            if (isset($this->pairs[$event->event_type])) {
                $open[$key][$event->event_type] = $event;
                continue;
            }

            foreach ($this->pairs as $startType => $pair) {
                if ($event->event_type !== $pair['stop'] || !isset($open[$key][$startType])) {
                    continue;
                }

                $start = $open[$key][$startType];
                $items[] = [
                    'employee_id' => $event->employee_id,
                    'assignment_id' => $event->assignment_id,
                    'pair_type' => $pair['type'],
                    'start_time' => $start->event_time,
                    'stop_time' => $event->event_time,
                ];

                unset($open[$key][$startType]);
            }
        }

        return $items;
    }
}
