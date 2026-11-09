<?php

namespace App\Support;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Button chain of a field worker: Gasfahrt → Dienstbeginn → Stop → (Dienstfahrt → Dienstbeginn → Stop …).
 * The chain is employee-wide. After a finished job and a longer break (the next work day)
 * a new chain starts with Gasfahrt from home instead of Dienstfahrt.
 */
class FieldWorkflow
{
    /** Hours after "Stop" / "Dienstfahrt beendet" after which a new day starts. */
    public const NEW_DAY_AFTER_HOURS = 6;

    private const NEXT = [
        'gasfahrt_start' => 'gasfahrt_stop',
        'gasfahrt_stop' => 'dienstbeginn',
        'dienstbeginn' => 'arbeit_stop',
        'arbeit_stop' => 'dienstfahrt_start',
        'dienstfahrt_start' => 'dienstfahrt_stop',
        'dienstfahrt_stop' => 'dienstbeginn',
    ];

    /** States in which nothing is running, so a long pause means the day is over. */
    private const RESTING = ['arbeit_stop', 'dienstfahrt_stop'];

    public static function lastEvent(int $employeeId): ?object
    {
        return DB::table('work_events')
            ->where('employee_id', $employeeId)
            ->orderByDesc('event_time')
            ->orderByDesc('id')
            ->first();
    }

    /** Event type that decides the current state; null means "start of a new chain". */
    public static function effectiveLastType(?object $lastEvent, ?Carbon $at = null): ?string
    {
        if (!$lastEvent) {
            return null;
        }

        $at ??= now();
        if (in_array($lastEvent->event_type, self::RESTING, true)
            && Carbon::parse($lastEvent->event_time)->addHours(self::NEW_DAY_AFTER_HOURS)->lessThanOrEqualTo($at)) {
            return null;
        }

        return $lastEvent->event_type;
    }

    public static function allowedAction(int $employeeId, ?Carbon $at = null): string
    {
        $type = self::effectiveLastType(self::lastEvent($employeeId), $at);

        return $type === null ? 'gasfahrt_start' : (self::NEXT[$type] ?? 'gasfahrt_start');
    }
}
