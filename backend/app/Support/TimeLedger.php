<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

/**
 * Single source of truth for actual working time.
 *
 * Builds start/stop pairs from the button events (Gasfahrt, Dienstbeginn/Stop,
 * Dienstfahrt), attaches the approval status, splits work time into the four
 * tariff zones (day, 20–24, 00–04, 04–06) and prices it with the employee tariff.
 */
class TimeLedger
{
    public const PAIRS = [
        'gasfahrt_start' => ['stop' => 'gasfahrt_stop', 'type' => 'gasfahrt', 'rate' => 'travel'],
        'dienstbeginn' => ['stop' => 'arbeit_stop', 'type' => 'arbeit', 'rate' => 'work'],
        'dienstfahrt_start' => ['stop' => 'dienstfahrt_stop', 'type' => 'dienstfahrt', 'rate' => 'travel'],
    ];

    public const STOP_TYPES = ['gasfahrt_stop', 'arbeit_stop', 'dienstfahrt_stop'];

    /**
     * @param array{employee_id?: int|null, assignment_id?: int|null, from?: string|null, to?: string|null, include_open?: bool} $filters
     *        from/to are dates (Y-m-d), compared with the start time of the pair.
     * @return array<int, array<string, mixed>>
     */
    public static function pairs(array $filters = []): array
    {
        $types = array_merge(array_keys(self::PAIRS), self::STOP_TYPES);
        $query = DB::table('work_events')
            ->whereIn('event_type', $types)
            ->orderBy('employee_id')
            ->orderBy('assignment_id')
            ->orderBy('event_time')
            ->orderBy('id');

        if (!empty($filters['employee_id'])) {
            $query->where('employee_id', (int) $filters['employee_id']);
        }
        if (!empty($filters['assignment_id'])) {
            $query->where('assignment_id', (int) $filters['assignment_id']);
        }
        // Load a little more than the period so pairs crossing midnight at the edges are complete.
        if (!empty($filters['from'])) {
            $query->where('event_time', '>=', date('Y-m-d 00:00:00', strtotime($filters['from'].' -1 day')));
        }
        if (!empty($filters['to'])) {
            $query->where('event_time', '<=', date('Y-m-d 23:59:59', strtotime($filters['to'].' +1 day')));
        }

        $open = [];
        $pairs = [];

        foreach ($query->get() as $event) {
            $key = $event->employee_id.'-'.$event->assignment_id;

            if (isset(self::PAIRS[$event->event_type])) {
                $open[$key][$event->event_type] = $event;
                continue;
            }

            foreach (self::PAIRS as $startType => $pair) {
                if ($event->event_type !== $pair['stop'] || !isset($open[$key][$startType])) {
                    continue;
                }

                $pairs[] = self::makePair($open[$key][$startType], $event, $pair);
                unset($open[$key][$startType]);
            }
        }

        if (!empty($filters['include_open'])) {
            foreach ($open as $starts) {
                foreach ($starts as $startType => $start) {
                    $pairs[] = self::makePair($start, null, self::PAIRS[$startType]);
                }
            }
        }

        $pairs = array_values(array_filter($pairs, function (array $pair) use ($filters) {
            $date = substr((string) $pair['start_time'], 0, 10);
            if (!empty($filters['from']) && $date < $filters['from']) {
                return false;
            }
            if (!empty($filters['to']) && $date > $filters['to']) {
                return false;
            }

            return true;
        }));

        self::attachApprovals($pairs);
        usort($pairs, fn ($a, $b) => strcmp((string) $a['start_time'], (string) $b['start_time']));

        return $pairs;
    }

    private static function makePair(object $start, ?object $stop, array $pair): array
    {
        $startPayload = json_decode((string) ($start->payload ?? ''), true) ?: [];
        $stopPayload = $stop ? (json_decode((string) ($stop->payload ?? ''), true) ?: []) : [];
        $minutes = $stop ? max(0, (int) round((strtotime($stop->event_time) - strtotime($start->event_time)) / 60)) : 0;

        return [
            'employee_id' => $start->employee_id !== null ? (int) $start->employee_id : null,
            'assignment_id' => $start->assignment_id !== null ? (int) $start->assignment_id : null,
            'pair_type' => $pair['type'],
            'rate_type' => $pair['rate'],
            'start_event_id' => (int) $start->id,
            'stop_event_id' => $stop ? (int) $stop->id : null,
            'start_time' => $start->event_time,
            'stop_time' => $stop?->event_time,
            'minutes' => $minutes,
            'bemerkung' => trim((string) ($stopPayload['bemerkung'] ?? $startPayload['bemerkung'] ?? '')) ?: null,
            'leistungsart' => $startPayload['leistungsart'] ?? null,
            'planned_exceeded' => (bool) ($stopPayload['planned_exceeded'] ?? false),
            'corrected' => isset($startPayload['original_event_time']) || isset($stopPayload['original_event_time']),
            'original_start_time' => $startPayload['original_event_time'] ?? null,
            'original_stop_time' => $stopPayload['original_event_time'] ?? null,
            'approval_id' => null,
            'approval_status' => $stop ? 'pending' : 'open',
            'invoiced' => false,
        ];
    }

    private static function attachApprovals(array &$pairs): void
    {
        if ($pairs === []) {
            return;
        }

        $approvals = DB::table('work_event_approvals')
            ->whereIn('employee_id', array_values(array_unique(array_filter(array_column($pairs, 'employee_id')))))
            ->get()
            ->keyBy(fn ($row) => implode('|', [$row->employee_id, $row->assignment_id, $row->pair_type, $row->start_time, $row->stop_time]));

        $invoiced = DB::table('invoice_items')->whereNotNull('approval_id')->pluck('approval_id')->map(fn ($id) => (int) $id)->flip();

        foreach ($pairs as &$pair) {
            if ($pair['stop_time'] === null) {
                continue;
            }
            $key = implode('|', [$pair['employee_id'], $pair['assignment_id'], $pair['pair_type'], $pair['start_time'], $pair['stop_time']]);
            $approval = $approvals[$key] ?? null;
            if ($approval) {
                $pair['approval_id'] = (int) $approval->id;
                $pair['approval_status'] = (string) $approval->status;
                $pair['invoiced'] = isset($invoiced[(int) $approval->id]);
            }
        }
    }

    /**
     * Minutes per tariff zone and on Sundays/holidays (work pairs only; travel is not split).
     * @return array{day: int, night_20_24: int, night_00_04: int, night_04_06: int, sunday_holiday: int, segments: array}
     */
    public static function zoneMinutes(array $pair): array
    {
        $result = ['day' => 0, 'night_20_24' => 0, 'night_00_04' => 0, 'night_04_06' => 0, 'sunday_holiday' => 0, 'segments' => []];

        if ($pair['pair_type'] !== 'arbeit' || $pair['stop_time'] === null) {
            return $result;
        }

        $result['segments'] = TariffZones::split((string) $pair['start_time'], (string) $pair['stop_time']);
        foreach ($result['segments'] as $segment) {
            $result[$segment['zone']] += $segment['minutes'];
            if ($segment['day_type'] !== 'workday') {
                $result['sunday_holiday'] += $segment['minutes'];
            }
        }

        return $result;
    }

    /**
     * Priced lines for one closed pair. Work is split by tariff zone and day type,
     * travel is one line at the travel rate.
     * @return array<int, array{type: string, tariff_zone: ?string, day_type: ?string, hours: float, hourly_rate: float, coefficient: float, amount: float, minutes: int}>
     */
    public static function priceLines(array $pair, ?object $profile): array
    {
        if ($pair['stop_time'] === null || $pair['minutes'] <= 0) {
            return [];
        }

        if ($pair['rate_type'] === 'travel') {
            $rate = (float) ($profile->travel_hourly_rate ?? 0);
            $hours = round($pair['minutes'] / 60, 2);

            return [[
                'type' => $pair['pair_type'],
                'tariff_zone' => null,
                'day_type' => null,
                'minutes' => $pair['minutes'],
                'hours' => $hours,
                'hourly_rate' => $rate,
                'coefficient' => 1.0,
                'amount' => round($hours * $rate, 2),
            ]];
        }

        $rate = (float) ($profile->standard_hourly_rate ?? 0);
        $groups = [];
        foreach (TariffZones::split((string) $pair['start_time'], (string) $pair['stop_time']) as $segment) {
            $coefficient = TariffZones::coefficient($segment, $profile);
            $key = $segment['zone'].'|'.$segment['day_type'];
            $groups[$key] ??= ['zone' => $segment['zone'], 'day_type' => $segment['day_type'], 'minutes' => 0, 'coefficient' => $coefficient];
            $groups[$key]['minutes'] += $segment['minutes'];
        }

        $lines = [];
        foreach ($groups as $group) {
            $hours = round($group['minutes'] / 60, 2);
            $lines[] = [
                'type' => $pair['pair_type'],
                'tariff_zone' => $group['zone'],
                'day_type' => $group['day_type'],
                'minutes' => $group['minutes'],
                'hours' => $hours,
                'hourly_rate' => $rate,
                'coefficient' => $group['coefficient'],
                'amount' => round($hours * $rate * $group['coefficient'], 2),
            ];
        }

        return $lines;
    }

    /** Approved, not yet invoiced cost lines (input for billing and invoices). */
    public static function billableLines(): array
    {
        $profiles = DB::table('employee_profiles')->get()->keyBy('id');
        $lines = [];

        foreach (self::pairs() as $pair) {
            if ($pair['approval_status'] !== 'approved' || $pair['invoiced'] || !$pair['approval_id']) {
                continue;
            }

            foreach (self::priceLines($pair, $profiles[$pair['employee_id']] ?? null) as $line) {
                if ($line['amount'] <= 0) {
                    continue;
                }
                $lines[] = $line + [
                    'approval_id' => $pair['approval_id'],
                    'employee_id' => $pair['employee_id'],
                    'assignment_id' => $pair['assignment_id'],
                    'start_time' => $pair['start_time'],
                    'stop_time' => $pair['stop_time'],
                ];
            }
        }

        return $lines;
    }

    /** Creates pending approval rows for every finished pair that has none yet. */
    public static function syncApprovals(): void
    {
        $now = now();
        foreach (self::pairs() as $pair) {
            if ($pair['stop_time'] === null || $pair['approval_id']) {
                continue;
            }
            DB::table('work_event_approvals')->insertOrIgnore([
                'employee_id' => $pair['employee_id'],
                'assignment_id' => $pair['assignment_id'],
                'pair_type' => $pair['pair_type'],
                'start_time' => $pair['start_time'],
                'stop_time' => $pair['stop_time'],
                'status' => 'pending',
                'comment' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }
}
