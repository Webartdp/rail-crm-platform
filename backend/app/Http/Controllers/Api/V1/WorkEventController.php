<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WorkEventController extends Controller
{
    public function index(): JsonResponse
    {
        $events = DB::table('work_events')
            ->orderByDesc('event_time')
            ->limit(50)
            ->get();

        return response()->json(['data' => $events]);
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
        $payload = $request->input('payload', []);
        $required = ['date', 'leistungsart', 'referenznummer', 'zugnummer', 'einsatzort'];
        $errors = [];

        foreach ($required as $field) {
            if (trim((string) ($payload[$field] ?? '')) === '') {
                $errors[$field] = [ucfirst($field).' is required.'];
            }
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
        $allowed = $this->allowedAction($request);

        if ($allowed !== $eventType) {
            return response()->json([
                'message' => 'Action is not allowed in current workflow state.',
                'allowed_action' => $allowed,
                'requested_action' => $eventType,
            ], 409);
        }

        $now = now();
        $payload = $request->input('payload', []);
        $payload['planned_exceeded'] = $plannedExceeded ?? $request->boolean('planned_exceeded');
        $payload['bemerkung'] = $request->input('bemerkung');

        $id = DB::table('work_events')->insertGetId([
            'employee_id' => $request->input('employee_id'),
            'assignment_id' => $request->input('assignment_id'),
            'event_type' => $eventType,
            'event_time' => $now,
            'latitude' => $request->input('latitude'),
            'longitude' => $request->input('longitude'),
            'location_accuracy' => $request->input('location_accuracy'),
            'address_text' => $request->input('address_text'),
            'payload' => json_encode($payload),
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        DB::table('audit_logs')->insert([
            'employee_id' => $request->input('employee_id'),
            'action' => $eventType,
            'entity_type' => 'work_event',
            'entity_id' => $id,
            'payload' => json_encode($payload),
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
            ],
        ]);
    }

    private function plannedTimeExceeded(Request $request): bool
    {
        $workOrder = DB::table('work_orders')
            ->where('id', $request->input('assignment_id'))
            ->first();

        if (!$workOrder?->planned_end_at) {
            return $request->boolean('planned_exceeded');
        }

        return now()->greaterThan(Carbon::parse($workOrder->planned_end_at));
    }

    private function allowedAction(Request $request): string
    {
        $last = DB::table('work_events')
            ->where('employee_id', $request->input('employee_id'))
            ->where('assignment_id', $request->input('assignment_id'))
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
}
