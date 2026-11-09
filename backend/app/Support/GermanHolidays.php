<?php

namespace App\Support;

use DateTimeImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Public holidays: the nationwide German holidays (computed) plus extra
 * regional days the admin adds in the `holidays` table.
 */
class GermanHolidays
{
    /** @var array<int, array<string, string>> */
    private static array $cache = [];

    /** Disabled in plain-PHP unit checks where no database is booted. */
    public static bool $withDatabase = true;

    /** @return array<string, string> date (Y-m-d) => name */
    public static function forYear(int $year): array
    {
        if (isset(self::$cache[$year])) {
            return self::$cache[$year];
        }

        $easter = self::easterSunday($year);

        $days = [
            sprintf('%d-01-01', $year) => 'Neujahr',
            $easter->modify('-2 days')->format('Y-m-d') => 'Karfreitag',
            $easter->modify('+1 day')->format('Y-m-d') => 'Ostermontag',
            sprintf('%d-05-01', $year) => 'Tag der Arbeit',
            $easter->modify('+39 days')->format('Y-m-d') => 'Christi Himmelfahrt',
            $easter->modify('+50 days')->format('Y-m-d') => 'Pfingstmontag',
            sprintf('%d-10-03', $year) => 'Tag der Deutschen Einheit',
            sprintf('%d-12-25', $year) => '1. Weihnachtstag',
            sprintf('%d-12-26', $year) => '2. Weihnachtstag',
        ];

        if (self::$withDatabase && class_exists(Schema::class) && Schema::hasTable('holidays')) {
            foreach (DB::table('holidays')->whereYear('date', $year)->get() as $row) {
                $days[substr((string) $row->date, 0, 10)] = (string) $row->name;
            }
        }

        return self::$cache[$year] = $days;
    }

    /** Gregorian Easter Sunday (anonymous algorithm, no PHP calendar extension needed). */
    public static function easterSunday(int $year): DateTimeImmutable
    {
        $a = $year % 19;
        $b = intdiv($year, 100);
        $c = $year % 100;
        $d = intdiv($b, 4);
        $e = $b % 4;
        $f = intdiv($b + 8, 25);
        $g = intdiv($b - $f + 1, 3);
        $h = (19 * $a + $b - $d - $g + 15) % 30;
        $i = intdiv($c, 4);
        $k = $c % 4;
        $l = (32 + 2 * $e + 2 * $i - $h - $k) % 7;
        $m = intdiv($a + 11 * $h + 22 * $l, 451);
        $month = intdiv($h + $l - 7 * $m + 114, 31);
        $day = (($h + $l - 7 * $m + 114) % 31) + 1;

        return new DateTimeImmutable(sprintf('%04d-%02d-%02d', $year, $month, $day));
    }

    public static function name(string $date): ?string
    {
        return self::forYear((int) substr($date, 0, 4))[$date] ?? null;
    }

    public static function isHoliday(string $date): bool
    {
        return self::name($date) !== null;
    }

    public static function flush(): void
    {
        self::$cache = [];
    }
}
