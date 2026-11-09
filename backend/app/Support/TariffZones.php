<?php

namespace App\Support;

use DateTimeImmutable;
use DateTimeZone;

/**
 * Splits a work interval into tariff segments.
 *
 * Time zones of the day (local business time, Europe/Berlin):
 *   day          06:00–20:00  (tariff 1, general)
 *   night_00_04  00:00–04:00  (tariff 2)
 *   night_04_06  04:00–06:00  (tariff 3)
 *   night_20_24  20:00–24:00  (tariff 4)
 *
 * Every segment also carries the day type: workday, sunday or holiday.
 */
class TariffZones
{
    public const DAY = 'day';
    public const NIGHT_00_04 = 'night_00_04';
    public const NIGHT_04_06 = 'night_04_06';
    public const NIGHT_20_24 = 'night_20_24';
    public const ZONES = [self::DAY, self::NIGHT_20_24, self::NIGHT_00_04, self::NIGHT_04_06];

    /** Hour boundaries inside one day and the zone that starts at each. */
    private const BOUNDARIES = [0 => self::NIGHT_00_04, 4 => self::NIGHT_04_06, 6 => self::DAY, 20 => self::NIGHT_20_24];

    /**
     * @return array<int, array{start: string, end: string, minutes: int, zone: string, date: string, day_type: string, holiday: ?string}>
     */
    public static function split(string $start, string $stop, ?string $timezone = null): array
    {
        $tz = new DateTimeZone($timezone ?: (function_exists('config') ? (string) config('app.timezone', 'Europe/Berlin') : 'Europe/Berlin'));
        $from = new DateTimeImmutable($start, $tz);
        $to = new DateTimeImmutable($stop, $tz);

        if ($to <= $from) {
            return [];
        }

        $segments = [];
        $cursor = $from;

        while ($cursor < $to) {
            $hour = (int) $cursor->format('G');
            $zone = self::zoneForHour($hour);
            $next = self::nextBoundary($cursor);
            $end = $next < $to ? $next : $to;
            $minutes = (int) round(($end->getTimestamp() - $cursor->getTimestamp()) / 60);
            $date = $cursor->format('Y-m-d');

            if ($minutes > 0) {
                $holiday = GermanHolidays::name($date);
                $segments[] = [
                    'start' => $cursor->format('Y-m-d H:i:s'),
                    'end' => $end->format('Y-m-d H:i:s'),
                    'minutes' => $minutes,
                    'zone' => $zone,
                    'date' => $date,
                    'day_type' => $holiday !== null ? 'holiday' : ($cursor->format('N') === '7' ? 'sunday' : 'workday'),
                    'holiday' => $holiday,
                ];
            }

            $cursor = $end;
        }

        return $segments;
    }

    public static function zoneForHour(int $hour): string
    {
        $zone = self::NIGHT_00_04;
        foreach (self::BOUNDARIES as $from => $name) {
            if ($hour >= $from) {
                $zone = $name;
            }
        }

        return $zone;
    }

    private static function nextBoundary(DateTimeImmutable $moment): DateTimeImmutable
    {
        $hour = (int) $moment->format('G');
        foreach (array_keys(self::BOUNDARIES) as $boundary) {
            if ($boundary > $hour) {
                return $moment->setTime($boundary, 0);
            }
        }

        return $moment->modify('+1 day')->setTime(0, 0);
    }

    /**
     * Coefficient for one segment from the employee profile.
     * Night zone and Sunday/holiday surcharges are not added up: the higher factor wins.
     */
    public static function coefficient(array $segment, ?object $profile): float
    {
        $zoneFactor = match ($segment['zone']) {
            self::NIGHT_20_24 => (float) ($profile->night_20_24_coefficient ?? 1),
            self::NIGHT_00_04 => (float) ($profile->night_00_04_coefficient ?? 1),
            self::NIGHT_04_06 => (float) ($profile->night_04_06_coefficient ?? 1),
            default => 1.0,
        };

        $dayFactor = match ($segment['day_type']) {
            'holiday' => (float) ($profile->holiday_coefficient ?? 1),
            'sunday' => (float) ($profile->sunday_coefficient ?? 1),
            default => 1.0,
        };

        return max(1.0, $zoneFactor, $dayFactor);
    }
}
