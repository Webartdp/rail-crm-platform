<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

/**
 * Brute-force protection for login, stored in the database (no cache store needed).
 * - 5 failed attempts for one e-mail within 15 minutes lock that e-mail for 15 minutes.
 * - 20 failed attempts from one IP within 15 minutes lock that IP for 15 minutes.
 */
class LoginThrottle
{
    public const WINDOW_MINUTES = 15;
    public const MAX_PER_EMAIL = 5;
    public const MAX_PER_IP = 20;

    /** Seconds until the lock ends, or 0 when login is allowed. */
    public static function lockedFor(string $email, string $ip): int
    {
        $since = now()->subMinutes(self::WINDOW_MINUTES);

        foreach ([['email', strtolower($email), self::MAX_PER_EMAIL], ['ip', $ip, self::MAX_PER_IP]] as [$column, $value, $max]) {
            $failed = DB::table('login_attempts')
                ->where($column, $value)
                ->where('successful', false)
                ->where('attempted_at', '>=', $since)
                ->orderByDesc('attempted_at')
                ->limit($max)
                ->pluck('attempted_at');

            if ($failed->count() >= $max) {
                $unlockAt = \Illuminate\Support\Carbon::parse($failed->last())->addMinutes(self::WINDOW_MINUTES);
                $seconds = now()->diffInSeconds($unlockAt, false);
                if ($seconds > 0) {
                    return (int) ceil($seconds);
                }
            }
        }

        return 0;
    }

    public static function record(string $email, string $ip, bool $successful): void
    {
        DB::table('login_attempts')->insert([
            'email' => strtolower($email),
            'ip' => $ip,
            'successful' => $successful,
            'attempted_at' => now(),
        ]);

        if ($successful) {
            // A successful login clears the failure streak for this e-mail.
            DB::table('login_attempts')->where('email', strtolower($email))->where('successful', false)->delete();
        }

        if (random_int(1, 50) === 1) {
            DB::table('login_attempts')->where('attempted_at', '<', now()->subDays(30))->delete();
        }
    }
}
