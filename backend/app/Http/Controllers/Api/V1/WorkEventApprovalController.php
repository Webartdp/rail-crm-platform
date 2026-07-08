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
        return response()->json(['data' => $this->completedPairs()]);
    }

    public function approve(Request $request): JsonResponse
    {
        return $this->setStatus($request, 'approved');
    }

    public function reject(Request $request): JsonResponse
    {
        return $this->setStatus($request, 'rejected');
    }

    private function setStatus(Request $request, string $status): JsonResponse
    {
        $required = ['employee_id', 'assignment_id', 'pair_type', 'start_time', 'stop_time'];
        foreach ($required as $field) {
            if (!$request->filled($field)) {
                return response()->json(['message' => $field.' is required.'], 422);
            }
        }

        $now = now();
        $where = [
            'employee_id' => $request->input('employee_id'),
            'assignment_id' => $request->input('assignment_id'),
            'pair_type' => $request->input('pair_type'),
            'start_time' => $request->input('start_time'),
            'stop_time' => $request->input('stop_time'),
        ];

        $existing = DB::table('work_event_approvals')->where($where)->first();
        $payload = [
            'status' => $status,
            'approved_by' => $request->input('approved_by'),
            'approved_at' => $status === 'approved' ? $now : null,
            'comment' => $request->input('comment'),
            'updated_at' => $now,
        ];

        if ($existing) {
            DB::table('work_event_approvals')->where('id', $existing->id)->update($payload);
        } else {
            DB::table('work_event_approvals')->insert(array_merge($where, $payload, ['created_at' => $now]));
        }

        DB::table('audit_logs')->insert([
            'user_id' => $request->input('approved_by'),
            'employee_id' => $request->input('employee_id'),
            'action' => 'work_event_'.$status,
            'entity_type' => 'work_event_approval',
            'entity_id' => $existing?->id,
            'payload' => json_encode($where),
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        return response()->json(['message' => 'Work event pair '.$status.'.']);
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
                $approval = DB::table('work_event_approvals')
                    ->where('employee_id', $event->employee_id)
                    ->where('assignment_id', $event->assignment_id)
                    ->where('pair_type', $pair['type'])
                    ->where('start_time', $start->event_time)
                    ->where('stop_time', $event->event_time)
                    ->first();

                $items[] = [
                    'employee_id' => $event->employee_id,
                    'assignment_id' => $event->assignment_id,
                    'pair_type' => $pair['type'],
                    'start_time' => $start->event_time,
                    'stop_time' => $event->event_time,
                    'minutes' => round(max(0, strtotime($event->event_time) - strtotime($start->event_time)) / 60),
                    'status' => $approval?->status ?? 'pending',
                    'comment' => $approval?->comment,
                ];

                unset($open[$key][$startType]);
            }
        }

        return array_reverse($items);
    }
}
