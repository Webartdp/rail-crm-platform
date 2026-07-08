<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class WorkEventCostController extends Controller
{
    private array $pairs = [
        'gasfahrt_start' => ['stop' => 'gasfahrt_stop', 'type' => 'gasfahrt', 'rate' => 'travel'],
        'dienstbeginn' => ['stop' => 'arbeit_stop', 'type' => 'arbeit', 'rate' => 'work'],
        'dienstfahrt_start' => ['stop' => 'dienstfahrt_stop', 'type' => 'dienstfahrt', 'rate' => 'travel'],
    ];

    public function __invoke(): JsonResponse
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
                $profile = DB::table('employee_profiles')->where('id', $event->employee_id)->first();
                $seconds = max(0, strtotime($event->event_time) - strtotime($start->event_time));
                $hours = round($seconds / 3600, 2);
                $rate = $this->rate($profile, $pair['rate']);
                $coefficient = $pair['rate'] === 'work' ? $this->coefficient($event, $profile) : 1.0;

                $items[] = [
                    'type' => $pair['type'],
                    'employee_id' => $event->employee_id,
                    'assignment_id' => $event->assignment_id,
                    'start_time' => $start->event_time,
                    'stop_time' => $event->event_time,
                    'hours' => $hours,
                    'hourly_rate' => $rate,
                    'coefficient' => $coefficient,
                    'amount' => round($hours * $rate * $coefficient, 2),
                ];

                unset($open[$key][$startType]);
            }
        }

        return response()->json(['data' => array_reverse($items)]);
    }

    private function rate(?object $profile, string $rateType): float
    {
        if ($rateType === 'travel') {
            return (float) ($profile->travel_hourly_rate ?? 0);
        }

        return (float) ($profile->standard_hourly_rate ?? 0);
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
