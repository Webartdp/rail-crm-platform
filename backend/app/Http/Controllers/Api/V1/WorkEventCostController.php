<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class WorkEventCostController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $events = DB::table('work_events')
            ->whereIn('event_type', ['dienstbeginn', 'arbeit_stop'])
            ->orderBy('employee_id')
            ->orderBy('assignment_id')
            ->orderBy('event_time')
            ->get();

        $open = [];
        $items = [];

        foreach ($events as $event) {
            $key = $event->employee_id.'-'.$event->assignment_id;

            if ($event->event_type === 'dienstbeginn') {
                $open[$key] = $event;
                continue;
            }

            if ($event->event_type !== 'arbeit_stop' || !isset($open[$key])) {
                continue;
            }

            $start = $open[$key];
            $profile = DB::table('employee_profiles')->where('id', $event->employee_id)->first();
            $seconds = max(0, strtotime($event->event_time) - strtotime($start->event_time));
            $hours = round($seconds / 3600, 2);
            $rate = (float) ($profile->standard_hourly_rate ?? 0);
            $coefficient = $this->coefficient($event, $profile);

            $items[] = [
                'employee_id' => $event->employee_id,
                'assignment_id' => $event->assignment_id,
                'start_time' => $start->event_time,
                'stop_time' => $event->event_time,
                'hours' => $hours,
                'hourly_rate' => $rate,
                'coefficient' => $coefficient,
                'amount' => round($hours * $rate * $coefficient, 2),
            ];

            unset($open[$key]);
        }

        return response()->json(['data' => array_reverse($items)]);
    }

    private function coefficient(object $event, ?object $profile): float
    {
        $payload = json_decode($event->payload ?? '{}', true) ?: [];

        if (($payload['is_holiday'] ?? false) === true) {
            return (float) ($profile->holiday_coefficient ?? 1);
        }

        if (($payload['is_sunday'] ?? false) === true) {
            return (float) ($profile->sunday_coefficient ?? 1);
        }

        if (($payload['is_night'] ?? false) === true) {
            return (float) ($profile->night_coefficient ?? 1);
        }

        return 1.0;
    }
}
