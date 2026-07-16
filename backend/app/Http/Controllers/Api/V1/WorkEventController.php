<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WorkEventController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = DB::table('work_events')
            ->orderByDesc('event_time')
            ->orderByDesc('id')
            ->limit(100);

        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->input('employee_id'));
        }

        if ($request->filled('assignment_id')) {
            $query->where('assignment_id', $request->input('assignment_id'));
        }

        return response()->json(['data' => $query->get()]);
    }

    public function startGasfahrt(Request $request): JsonResponse
    {
        return $this->storeEvent($request, 'gasfahrt_start', 'Gasfahrt started');
    }

    public function stopGasfahrt(Request $request): JsonResponse
    {
        return $this->storeEvent($request, 'gasfahrt_stop', 'Gasfahrt stopped');
    }

    public function dienstbeginn(Request $request): JsonResponse
    {
        $payload = $this->payload($request);
        $required = ['date', 'leistungsart', 'referenznummer', 'zugnummer', 'einsatzort'];
        $errors = [];

        foreach ($required as $field) {
            if (trim((string) ($payload[$field] ?? '')) === '') {
                $errors[$field] = [ucfirst($field).' is required.'];
            }
        }

        if (!$this->assignmentId($request)) {
            $errors['assignment_id'] = ['Work order is required.'];
        }

        if ($errors !== []) {
            return response()->json([
                'message' => 'Dienstbeginn required fields are missing.',
                'errors' => $errors,
            ], 422);
        }

        return $this->storeEvent($request, 'dienstbeginn', 'Dienstbeginn stored');
    }

    public function stopArbeit(Request $request): JsonResponse
    {
        if (!$this->assignmentId($request)) {
            return response()->json([
                'message' => 'Work order is required before stopping work.',
                'errors' => ['assignment_id' => ['Work order is required.']],
            ], 422);
        }

        $plannedExceeded = $this->plannedTimeExceeded($request);
        $bemerkung = trim((string) $request->input('bemerkung', ''));

        if ($plannedExceeded && $bemerkung === '') {
            return response()->json([
                'message' => 'Bemerkung is required when planned time is exceeded.',
                'errors' => ['bemerkung' => ['Bemerkung is required.']],
                'planned_exceeded' => true,
            ], 422);
        }

        return $this->storeEvent($request, 'arbeit_stop', 'Work stopped', $plannedExceeded);
    }

    public function startDienstfahrt(Request $request): JsonResponse
    {
        return $this->storeEvent($request, 'dienstfahrt_start', 'Dienstfahrt started');
    }

    public function stopDienstfahrt(Request $request): JsonResponse
    {
        return $this->storeEvent($request, 'dienstfahrt_stop', 'Dienstfahrt stopped');
    }

    private function storeEvent(Request $request, string $eventType, string $message, ?bool $plannedExceeded = null): JsonResponse
    {
        $employeeId = $this->employeeId($request);
        $assignmentId = $this->assignmentId($request);
        $allowed = $this->allowedAction($employeeId);

        if ($allowed !== $eventType) {
            return response()->json([
                'message' => 'Action is not allowed in current workflow state.',
                'allowed_action' => $allowed,
                'requested_action' => $eventType,
            ], 409);
        }

        $now = now();
        $payload = $this->payload($request);
        $payload['planned_exceeded'] = $plannedExceeded ?? $request->boolean('planned_exceeded');
        $payload['bemerkung'] = $request->input('bemerkung');

        $id = DB::table('work_events')->insertGetId([
            'employee_id' => $employeeId,
            'assignment_id' => $assignmentId,
            'event_type' => $eventType,
            'event_time' => $now,
            'latitude' => $request->input('latitude'),
            'longitude' => $request->input('longitude'),
            'location_accuracy' => $request->input('location_accuracy'),
            'address_text' => $request->input('address_text'),
            'payload' => json_encode($payload, JSON_UNESCAPED_UNICODE),
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $this->updateWorkOrderStatus($assignmentId, $eventType, $now);

        DB::table('audit_logs')->insert([
            'employee_id' => $employeeId,
            'action' => $eventType,
            'entity_type' => 'work_event',
            'entity_id' => $id,
            'payload' => json_encode($payload, JSON_UNESCAPED_UNICODE),
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        return response()->json([
            'message' => $message,
            'event' => [
                'id' => $id,
                'type' => $eventType,
                'stored' => true,
                'event_time' => $now->toISOString(),
                'employee_id' => $employeeId,
                'assignment_id' => $assignmentId,
                'latitude' => $request->input('latitude'),
                'longitude' => $request->input('longitude'),
                'location_accuracy' => $request->input('location_accuracy'),
            ],
        ]);
    }

    private function updateWorkOrderStatus(?int $assignmentId, string $eventType, $now): void
    {
        if (!$assignmentId) {
            return;
        }

        // Important:
        // Gasfahrt/Dienstfahrt are employee route events, not work-order execution.
        // They must not move a finished work order back to in_progress.
        $status = match ($eventType) {
            'dienstbeginn' => 'in_progress',
            'arbeit_stop' => 'waiting_approval',
            default => null,
        };

        if (!$status) {
            return;
        }

        DB::table('work_orders')->where('id', $assignmentId)->update([
            'status' => $status,
            'updated_at' => $now,
        ]);
    }

    private function plannedTimeExceeded(Request $request): bool
    {
        $workOrder = DB::table('work_orders')
            ->where('id', $this->assignmentId($request))
            ->first();

        if (!$workOrder?->planned_end_at) {
            return $request->boolean('planned_exceeded');
        }

        return now()->greaterThan(Carbon::parse($workOrder->planned_end_at));
    }

    private function allowedAction(int $employeeId): string
    {
        // Workflow is employee-wide. Assignment/work order can change after Dienstfahrt stop.
        $last = DB::table('work_events')
            ->where('employee_id', $employeeId)
            ->orderByDesc('event_time')
            ->orderByDesc('id')
            ->first();

        return match ($last?->event_type) {
            null => 'gasfahrt_start',
            'gasfahrt_start' => 'gasfahrt_stop',
            'gasfahrt_stop' => 'dienstbeginn',
            'dienstbeginn' => 'arbeit_stop',
            'arbeit_stop' => 'dienstfahrt_start',
            'dienstfahrt_start' => 'dienstfahrt_stop',
            'dienstfahrt_stop' => 'dienstbeginn',
            default => 'gasfahrt_start',
        };
    }

    private function employeeId(Request $request): int
    {
        return (int) $request->input('employee_id', 1);
    }

    private function assignmentId(Request $request): ?int
    {
        $assignmentId = $request->input('assignment_id');

        if ($assignmentId === null || $assignmentId === '') {
            return null;
        }

        return (int) $assignmentId;
    }

    private function payload(Request $request): array
    {
        $payload = $request->input('payload', []);

        return is_array($payload) ? $payload : [];
    }
}
