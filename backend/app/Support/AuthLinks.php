<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

/** Invitation and password-reset links (one-time, hashed in the database). */
class AuthLinks
{
    public const INVITE = 'invite';
    public const RESET = 'reset';

    public static function create(int $userId, string $type, ?int $createdBy = null): array
    {
        $plain = Str::random(48);
        $hours = $type === self::INVITE ? 72 : 2;

        // Only one active link of each type per user.
        DB::table('auth_links')->where('user_id', $userId)->where('type', $type)->whereNull('used_at')->delete();

        DB::table('auth_links')->insert([
            'user_id' => $userId,
            'type' => $type,
            'token_hash' => hash('sha256', $plain),
            'expires_at' => now()->addHours($hours),
            'created_by' => $createdBy,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return [
            'token' => $plain,
            'url' => FrontendUrl::to('/login/set-password?token='.$plain),
            'expires_at' => now()->addHours($hours)->toIso8601String(),
        ];
    }

    /** Valid, unused, not expired link or null. */
    public static function find(string $plain): ?object
    {
        if ($plain === '') {
            return null;
        }

        return DB::table('auth_links')
            ->where('token_hash', hash('sha256', $plain))
            ->whereNull('used_at')
            ->where('expires_at', '>', now())
            ->first();
    }

    public static function markUsed(int $id): void
    {
        DB::table('auth_links')->where('id', $id)->update(['used_at' => now(), 'updated_at' => now()]);
    }

    /** Sends the link by e-mail. Returns false when mail is not configured or sending failed. */
    public static function send(object $user, string $type, string $url): bool
    {
        $locale = in_array($user->locale ?? null, ['de', 'ru'], true) ? $user->locale : app()->getLocale();
        $subject = __($type === self::INVITE ? 'Invitation to Rail CRM' : 'Reset your Rail CRM password', [], $locale);
        $body = __($type === self::INVITE ? 'mail.invite' : 'mail.reset', ['name' => $user->name, 'url' => $url], $locale);

        if (!MailSettings::ready()) {
            Log::info('Auth link mail not sent (mailer is not configured)', ['user_id' => $user->id, 'type' => $type]);

            return false;
        }

        try {
            Mail::raw($body, function ($message) use ($user, $subject) {
                $message->to($user->email, $user->name)->subject($subject);
            });

            return true;
        } catch (\Throwable $exception) {
            Log::warning('Auth link mail failed', ['user_id' => $user->id, 'error' => $exception->getMessage()]);

            return false;
        }
    }
}
