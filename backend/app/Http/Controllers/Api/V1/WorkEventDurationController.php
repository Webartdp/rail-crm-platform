<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class WorkEventDurationController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $events = DB::table('work_events')
            ->orderBy('employee_id')
            ->orderBy('assignment_id')
            ->orderBy('event_time')
            ->get();

        $pairs = [
            'gasfahrt_start' => ['gasfahrt_stop', 'Gasfahrt'],
            'dienstbeginn' => ['arbeit_stop', 'Arbeit'],
            'dienstfahrt_start' => ['dienstfahrt_stop', 'Dienstfahrt'],
        ];

        $open = [];
        $durations = [];

        foreach ($events as $event) {
            $key = $event->employee_id.'-'.$event->assignment_id;

            if (isset($pairs[$event->event_type])) {
                $open[$key][$event->event_type] = $event;
                continue;
            }

            foreach ($pairs as $startType => [$stopType, $label]) {
                if ($event->event_type !== $stopType || !isset($open[$key][$startType])) {
                    continue;
                }

                $start = $open[$key][$startType];
                $seconds = max(0, strtotime($event->event_time) - strtotime($start->event_time));

                $durations[] = [
                    'type' => $label,
                    'employee_id' => $event->employee_id,
                    'assignment_id' => $event->assignment_id,
                    'start_event' => $startType,
                    'stop_event' => $stopType,
                    'start_time' => $start->event_time,
                    'stop_time' => $event->event_time,
                    'duration_minutes' => (int) round($seconds / 60),
                ];

                unset($open[$key][$startType]);
            }
        }

        return response()->json(['data' => array_reverse($durations)]);
    }
}
