<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Support\CurrentUser;
use App\Support\TimeLedger;
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
            ->limit(min(2000, max(1, (int) $request->input('limit', 500))));

        if (CurrentUser::isEmployee($request)) {
            $query->where('employee_id', CurrentUser::actingEmployeeId($request) ?? -1);
        } elseif ($request->filled('employee_id')) {
            $query->where('employee_id', $request->input('employee_id'));
        }

        if ($request->filled('date_from')) {
            $query->where('event_time', '>=', $request->input('date_from').' 00:00:00');
        }
        if ($request->filled('date_to')) {
            $query->where('event_time', '<=', $request->input('date_to').' 23:59:59');
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
        $payload = $this->payloadWithOrderDefaults($request);
        $request->merge(['payload' => $payload]);
        $required = ['date', 'leistungsart', 'referenznummer', 'einsatzort'];
        $errors = [];

        foreach ($required as $field) {
            if (trim((string) ($payload[$field] ?? '')) === '') {
                $errors[$field] = [__('validation.required', ['attribute' => __('fields.'.$field)])];
            }
        }

        if (!$this->assignmentId($request)) {
            $errors['assignment_id'] = [__('Work order is required before stopping work.')];
        }

        if ($errors !== []) {
            return response()->json([
                'message' => __('Dienstbeginn required fields are missing.'),
                'errors' => $errors,
            ], 422);
        }

        return $this->storeEvent($request, 'dienstbeginn', 'Dienstbeginn stored');
    }

    public function stopArbeit(Request $request): JsonResponse
    {
        if (!$this->assignmentId($request)) {
            return response()->json([
                'message' => __('Work order is required before stopping work.'),
                'errors' => ['assignment_id' => [__('Work order is required before stopping work.')]],
            ], 422);
        }

        $plannedExceeded = $this->plannedTimeExceeded($request);
        $bemerkung = trim((string) $request->input('bemerkung', ''));

        if ($plannedExceeded && $bemerkung === '') {
            return response()->json([
                'message' => __('Bemerkung is required when planned time is exceeded.'),
                'errors' => ['bemerkung' => [__('Bemerkung is required when planned time is exceeded.')]],
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
        $assignmentId = $request->input('assignment_id');

        if ($assignmentId) {
            $workOrder = DB::table('work_orders')->where('id', $assignmentId)->first();

            if (!$workOrder) {
                return response()->json(['message' => __('Work order not found.')], 404);
            }

            if (in_array((string) $workOrder->status, ['approved', 'invoiced', 'rejected', 'cancelled', 'closed'], true)) {
                return response()->json([
                    'message' => __('Work order is closed for field events.'),
                    'status' => $workOrder->status,
                ], 422);
            }
        }

        $employeeId = $this->employeeId($request);
        if (!$employeeId) {
            return response()->json(['message' => __('Your user is not linked to an employee profile.')], 422);
        }

        $assignmentId = $this->assignmentId($request);
        if ($assignmentId && CurrentUser::isEmployee($request) && !$this->isAssigned($assignmentId, $employeeId)) {
            return response()->json(['message' => __('This work order is not assigned to you.')], 403);
        }

        $allowed = $this->allowedAction($employeeId);

        if ($allowed !== $eventType) {
            return response()->json([
                'message' => __('Action is not allowed in current workflow state.'),
                'allowed_action' => $allowed,
                'requested_action' => $eventType,
            ], 409);
        }

        $now = now();
        $eventTime = $now;

        // Offline mode: the phone had no connection and sends the button time it recorded.
        if ($request->filled('recorded_at')) {
            $recorded = Carbon::parse((string) $request->input('recorded_at'))->setTimezone(config('app.timezone'));
            $lastTime = DB::table('work_events')->where('employee_id', $employeeId)->max('event_time');
            if ($recorded->greaterThan($now->copy()->addMinutes(5)) || $recorded->lessThan($now->copy()->subHours(72))
                || ($lastTime && $recorded->lessThan(Carbon::parse($lastTime)))) {
                return response()->json(['message' => __('The offline time of this action is not plausible.')], 422);
            }
            $eventTime = $recorded;
        }

        $payload = $this->payload($request);
        if ($eventTime !== $now) {
            $payload['offline'] = true;
            $payload['synced_at'] = $now->toDateTimeString();
        }
        $payload['planned_exceeded'] = $eventType === 'arbeit_stop'
            ? ($plannedExceeded ?? $request->boolean('planned_exceeded'))
            : false;
        $payload['bemerkung'] = $request->input('bemerkung');

        $id = DB::table('work_events')->insertGetId([
            'employee_id' => $employeeId,
            'assignment_id' => $assignmentId,
            'event_type' => $eventType,
            'event_time' => $eventTime,
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
            'message' => __($message),
            'event' => [
                'id' => $id,
                'type' => $eventType,
                'stored' => true,
                'event_time' => $eventTime->toISOString(),
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

    private function employeeId(Request $request): ?int
    {
        return CurrentUser::actingEmployeeId($request);
    }

    private function isAssigned(int $assignmentId, int $employeeId): bool
    {
        return DB::table('work_order_employees')->where('work_order_id', $assignmentId)->where('employee_id', $employeeId)->exists()
            || DB::table('work_orders')->where('id', $assignmentId)->where('employee_id', $employeeId)->exists();
    }

    /** Leistungsart, Referenznummer, Zugnummer and Einsatzort (= object address) come from the work order. */
    private function payloadWithOrderDefaults(Request $request): array
    {
        $payload = $this->payload($request);
        $order = $this->assignmentId($request) ? DB::table('work_orders')->where('id', $this->assignmentId($request))->first() : null;

        if ($order) {
            $details = json_decode((string) $order->details, true) ?: [];
            $object = $order->object_id ? DB::table('objects')->where('id', $order->object_id)->first() : null;
            $defaults = [
                'date' => now()->toDateString(),
                'leistungsart' => $details['leistungsart'] ?? null,
                'referenznummer' => $order->reference_number,
                'zugnummer' => $details['zugnummer'] ?? null,
                'einsatzort' => $object->address ?? ($details['object_address'] ?? ($details['einsatzort'] ?? null)),
            ];
            foreach ($defaults as $key => $value) {
                if (trim((string) ($payload[$key] ?? '')) === '' && $value !== null && $value !== '') {
                    $payload[$key] = $value;
                }
            }
        }

        // Night/Sunday/holiday are detected automatically from the time, never sent by the employee.
        unset($payload['is_night'], $payload['is_sunday'], $payload['is_holiday']);

        return $payload;
    }

    /**
     * Employee corrects the actual start/stop of a finished pair (e.g. forgot to press Stop).
     * Allowed while the time is not approved; the original button time is kept in the payload.
     */
    public function correct(Request $request): JsonResponse
    {
        $data = $request->validate([
            'start_event_id' => ['required', 'integer'],
            'stop_event_id' => ['required', 'integer'],
            'start_time' => ['required', 'date'],
            'stop_time' => ['required', 'date', 'after:start_time'],
            'bemerkung' => ['nullable', 'string', 'max:2000'],
        ]);

        $start = DB::table('work_events')->where('id', $data['start_event_id'])->first();
        $stop = DB::table('work_events')->where('id', $data['stop_event_id'])->first();
        $pairType = $start ? (TimeLedger::PAIRS[$start->event_type] ?? null) : null;

        if (!$start || !$stop || !$pairType || $pairType['stop'] !== $stop->event_type
            || $start->employee_id !== $stop->employee_id || $start->assignment_id !== $stop->assignment_id) {
            return response()->json(['message' => __('These events do not form a time pair.')], 422);
        }

        if (CurrentUser::isEmployee($request) && (int) $start->employee_id !== (int) CurrentUser::actingEmployeeId($request)) {
            return response()->json(['message' => __('Forbidden.')], 403);
        }

        $approval = DB::table('work_event_approvals')
            ->where('employee_id', $start->employee_id)
            ->where('assignment_id', $start->assignment_id)
            ->where('pair_type', $pairType['type'])
            ->where('start_time', $start->event_time)
            ->where('stop_time', $stop->event_time)
            ->first();

        if ($approval && $approval->status === 'approved') {
            return response()->json(['message' => __('Approved time can no longer be changed.')], 422);
        }
        if ($approval && DB::table('invoice_items')->where('approval_id', $approval->id)->exists()) {
            return response()->json(['message' => __('Approved time can no longer be changed.')], 422);
        }

        $newStart = date('Y-m-d H:i:s', strtotime($data['start_time']));
        $newStop = date('Y-m-d H:i:s', strtotime($data['stop_time']));
        $now = now();
        $user = CurrentUser::fromRequest($request);

        DB::transaction(function () use ($start, $stop, $newStart, $newStop, $approval, $data, $now, $user, $pairType) {
            foreach ([[$start, $newStart], [$stop, $newStop]] as [$event, $time]) {
                $payload = json_decode((string) $event->payload, true) ?: [];
                $payload['original_event_time'] ??= $event->event_time;
                $payload['corrected_at'] = $now->toDateTimeString();
                $payload['corrected_by'] = $user?->id;
                if ($event->id === $stop->id && array_key_exists('bemerkung', $data)) {
                    $payload['bemerkung'] = $data['bemerkung'];
                }
                DB::table('work_events')->where('id', $event->id)->update([
                    'event_time' => $time,
                    'payload' => json_encode($payload, JSON_UNESCAPED_UNICODE),
                    'updated_at' => $now,
                ]);
            }

            if ($approval) {
                // A rejected time that gets corrected goes back to the approval queue.
                DB::table('work_event_approvals')->where('id', $approval->id)->update([
                    'start_time' => $newStart,
                    'stop_time' => $newStop,
                    'status' => 'pending',
                    'approved_by' => null,
                    'approved_at' => null,
                    'updated_at' => $now,
                ]);
            }

            DB::table('audit_logs')->insert([
                'user_id' => $user?->id,
                'employee_id' => $start->employee_id,
                'action' => 'time_corrected',
                'entity_type' => 'work_event',
                'entity_id' => $start->id,
                'payload' => json_encode([
                    'pair_type' => $pairType['type'],
                    'from' => [$start->event_time, $stop->event_time],
                    'to' => [$newStart, $newStop],
                ]),
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        });

        return response()->json(['message' => __('Time corrected. It will be checked by the manager.')]);
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
