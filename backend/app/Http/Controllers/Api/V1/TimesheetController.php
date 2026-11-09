<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Support\CurrentUser;
use App\Support\GermanHolidays;
use App\Support\TimeLedger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Timesheet (Stundenzettel) of one employee for a period: planned vs actual time,
 * hours per tariff zone, Sundays/holidays, notes and approval status.
 */
class TimesheetController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $request->validate([
            'employee_id' => ['nullable', 'integer'],
            'date_from' => ['required', 'date'],
            'date_to' => ['required', 'date', 'after_or_equal:date_from'],
        ]);

        $employeeId = CurrentUser::actingEmployeeId($request);
        if (!$employeeId) {
            return response()->json(['message' => __('Your user is not linked to an employee profile.')], 422);
        }

        $profile = DB::table('employee_profiles')->where('id', $employeeId)->first();
        if (!$profile) {
            return response()->json(['message' => __('Employee profile not found.')], 404);
        }

        $from = date('Y-m-d', strtotime((string) $request->input('date_from')));
        $to = date('Y-m-d', strtotime((string) $request->input('date_to')));
        $pairs = TimeLedger::pairs(['employee_id' => $employeeId, 'from' => $from, 'to' => $to, 'include_open' => true]);

        $orderIds = array_values(array_unique(array_filter(array_column($pairs, 'assignment_id'))));
        $orders = DB::table('work_orders')->whereIn('id', $orderIds ?: [0])->get()->keyBy('id');

        $rows = [];
        $totals = ['work' => 0, 'travel' => 0, 'day' => 0, 'night_20_24' => 0, 'night_00_04' => 0, 'night_04_06' => 0, 'sunday_holiday' => 0, 'planned' => 0];

        foreach ($pairs as $pair) {
            $order = $pair['assignment_id'] ? ($orders[$pair['assignment_id']] ?? null) : null;
            $details = $order ? (json_decode((string) $order->details, true) ?: []) : [];
            $zones = TimeLedger::zoneMinutes($pair);
            $isWork = $pair['pair_type'] === 'arbeit';
            $date = substr((string) $pair['start_time'], 0, 10);
            $plannedMinutes = $isWork && $order && $order->planned_start_at && $order->planned_end_at
                ? max(0, (int) round((strtotime($order->planned_end_at) - strtotime($order->planned_start_at)) / 60))
                : 0;

            $rows[] = [
                'date' => $date,
                'weekday' => (int) date('N', strtotime($date)),
                'holiday' => GermanHolidays::name($date),
                'type' => $pair['pair_type'],
                'assignment_id' => $pair['assignment_id'],
                'reference_number' => $order->reference_number ?? null,
                'work_title' => $details['work_title'] ?? ($order->title ?? null),
                'leistungsart' => $details['leistungsart'] ?? $pair['leistungsart'],
                'zugnummer' => $details['zugnummer'] ?? null,
                'client' => $details['customer_name'] ?? null,
                'object' => $details['object_name'] ?? null,
                'address' => $details['object_address'] ?? ($details['einsatzort'] ?? null),
                'planned_start' => $isWork ? ($order->planned_start_at ?? null) : null,
                'planned_end' => $isWork ? ($order->planned_end_at ?? null) : null,
                'planned_minutes' => $plannedMinutes,
                'actual_start' => $pair['start_time'],
                'actual_end' => $pair['stop_time'],
                'minutes' => $pair['minutes'],
                'minutes_day' => $zones['day'],
                'minutes_night_20_24' => $zones['night_20_24'],
                'minutes_night_00_04' => $zones['night_00_04'],
                'minutes_night_04_06' => $zones['night_04_06'],
                'minutes_sunday_holiday' => $zones['sunday_holiday'],
                'bemerkung' => $pair['bemerkung'],
                'corrected' => $pair['corrected'],
                'status' => $pair['approval_status'],
                'start_event_id' => $pair['start_event_id'],
                'stop_event_id' => $pair['stop_event_id'],
            ];

            if ($isWork) {
                $totals['work'] += $pair['minutes'];
                $totals['planned'] += $plannedMinutes;
                foreach (['day', 'night_20_24', 'night_00_04', 'night_04_06', 'sunday_holiday'] as $zone) {
                    $totals[$zone] += $zones[$zone];
                }
            } else {
                $totals['travel'] += $pair['minutes'];
            }
        }

        return response()->json([
            'data' => [
                'employee' => [
                    'id' => (int) $profile->id,
                    'name' => trim(($profile->first_name ?? '').' '.($profile->last_name ?? '')) ?: '#'.$profile->id,
                    'home_location' => $profile->home_location,
                ],
                'period' => ['from' => $from, 'to' => $to],
                'rows' => $rows,
                'totals' => $totals + ['days' => count(array_unique(array_column(array_filter($rows, fn ($row) => $row['type'] === 'arbeit'), 'date')))],
                'generated_at' => now()->toDateTimeString(),
            ],
        ]);
    }
}
