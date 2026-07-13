<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EmployeeFieldStateController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $employeeId = (int) $request->input('employee_id', 1);
        $assignmentId = $request->input('assignment_id');

        // Workflow is employee-wide: one work day has one event chain.
        // The selected assignment/work order is still used for planned time and payload data.
        $lastEvent = DB::table('work_events')
            ->where('employee_id', $employeeId)
            ->orderByDesc('event_time')
            ->orderByDesc('id')
            ->first();

        $state = $this->stateFromEvent($lastEvent?->event_type);
        $planned = $this->plannedStatus($assignmentId);
        $requiresBemerkung = $state['action'] === 'arbeit_stop' && $planned['planned_exceeded'];

        return response()->json([
            'employee_id' => $employeeId,
            'assignment_id' => $assignmentId,
            'last_assignment_id' => $lastEvent?->assignment_id,
            'last_event_type' => $lastEvent?->event_type,
            'current_state' => $state['state'],
            'allowed_actions' => [$state['action']],
            'next_button' => $state['button'],
            'required_fields' => $requiresBemerkung ? ['bemerkung'] : $state['required_fields'],
            'planned_end_at' => $planned['planned_end_at'],
            'planned_exceeded' => $planned['planned_exceeded'],
            'requires_bemerkung' => $requiresBemerkung,
            'leistungsart_options' => [
                'WTU',
                'WSU',
                'E-WU',
                'Rb',
                'Azf',
                'RID-Kontrolle',
                'Zugbeschtreifung',
                'custom',
            ],
        ]);
    }

    private function plannedStatus($assignmentId): array
    {
        if (!$assignmentId) {
            return ['planned_end_at' => null, 'planned_exceeded' => false];
        }

        $workOrder = DB::table('work_orders')->where('id', $assignmentId)->first();

        if (!$workOrder?->planned_end_at) {
            return ['planned_end_at' => null, 'planned_exceeded' => false];
        }

        return [
            'planned_end_at' => $workOrder->planned_end_at,
            'planned_exceeded' => now()->greaterThan(Carbon::parse($workOrder->planned_end_at)),
        ];
    }

    private function stateFromEvent(?string $eventType): array
    {
        return match ($eventType) {
            null => [
                'state' => 'idle',
                'action' => 'gasfahrt_start',
                'button' => 'Gasfahrt',
                'required_fields' => [],
            ],
            'gasfahrt_start' => [
                'state' => 'gasfahrt_active',
                'action' => 'gasfahrt_stop',
                'button' => 'Gasfahrt beendet',
                'required_fields' => [],
            ],
            'gasfahrt_stop' => [
                'state' => 'arrived',
                'action' => 'dienstbeginn',
                'button' => 'Dienstbeginn',
                'required_fields' => ['date', 'leistungsart', 'referenznummer', 'zugnummer', 'einsatzort'],
            ],
            'dienstbeginn' => [
                'state' => 'work_active',
                'action' => 'arbeit_stop',
                'button' => 'Stop',
                'required_fields' => ['bemerkung_if_planned_exceeded'],
            ],
            'arbeit_stop' => [
                'state' => 'work_finished',
                'action' => 'dienstfahrt_start',
                'button' => 'Start Dienstfahrt',
                'required_fields' => [],
            ],
            'dienstfahrt_start' => [
                'state' => 'dienstfahrt_active',
                'action' => 'dienstfahrt_stop',
                'button' => 'Stop Dienstfahrt',
                'required_fields' => [],
            ],
            'dienstfahrt_stop' => [
                'state' => 'dienstfahrt_finished',
                'action' => 'dienstbeginn',
                'button' => 'Dienstbeginn',
                'required_fields' => ['date', 'leistungsart', 'referenznummer', 'zugnummer', 'einsatzort'],
            ],
            default => [
                'state' => 'idle',
                'action' => 'gasfahrt_start',
                'button' => 'Gasfahrt',
                'required_fields' => [],
            ],
        };
    }
}
