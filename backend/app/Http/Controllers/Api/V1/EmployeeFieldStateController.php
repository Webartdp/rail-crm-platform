<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EmployeeFieldStateController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $employeeId = (int) $request->input('employee_id', 1);
        $assignmentId = $request->input('assignment_id');

        $query = DB::table('work_events')
            ->where('employee_id', $employeeId)
            ->orderByDesc('event_time');

        if ($assignmentId) {
            $query->where('assignment_id', $assignmentId);
        }

        $lastEvent = $query->first();
        $state = $this->stateFromEvent($lastEvent?->event_type);

        return response()->json([
            'employee_id' => $employeeId,
            'assignment_id' => $assignmentId,
            'last_event_type' => $lastEvent?->event_type,
            'current_state' => $state['state'],
            'allowed_actions' => [$state['action']],
            'next_button' => $state['button'],
            'required_fields' => $state['required_fields'],
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
