<?php

namespace App\Support;

use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;

/**
 * SMTP settings the administrator enters in the app (Admin page).
 * Stored in app_settings; the password is encrypted with APP_KEY.
 * When nothing is configured here, the .env mailer (MAIL_*) is used as before.
 */
class MailSettings
{
    public const KEYS = [
        'mail_enabled', 'mail_host', 'mail_port', 'mail_encryption',
        'mail_username', 'mail_password', 'mail_from_address', 'mail_from_name',
    ];

    /** Settings for the admin form; the password itself is never returned. */
    public static function forForm(): array
    {
        $stored = self::stored();

        return [
            'mail_enabled' => ($stored['mail_enabled'] ?? '') === '1',
            'mail_host' => $stored['mail_host'] ?? '',
            'mail_port' => $stored['mail_port'] ?? '587',
            'mail_encryption' => $stored['mail_encryption'] ?? 'tls',
            'mail_username' => $stored['mail_username'] ?? '',
            'mail_password_set' => ($stored['mail_password'] ?? '') !== '',
            'mail_from_address' => $stored['mail_from_address'] ?? '',
            'mail_from_name' => $stored['mail_from_name'] ?? '',
            'ready' => self::ready(),
            'source' => self::fromApp($stored) ? 'app' : (self::envReady() ? 'env' : 'none'),
        ];
    }

    public static function save(array $data): void
    {
        $values = [];
        foreach (['mail_host', 'mail_port', 'mail_encryption', 'mail_username', 'mail_from_address', 'mail_from_name'] as $key) {
            if (array_key_exists($key, $data)) {
                $values[$key] = trim((string) ($data[$key] ?? ''));
            }
        }
        if (array_key_exists('mail_enabled', $data)) {
            $values['mail_enabled'] = $data['mail_enabled'] ? '1' : '';
        }
        if (!empty($data['mail_password_clear'])) {
            $values['mail_password'] = '';
        } elseif (isset($data['mail_password']) && $data['mail_password'] !== '') {
            $values['mail_password'] = Crypt::encryptString((string) $data['mail_password']);
        }

        Settings::put($values);
    }

    /**
     * Points Laravel's mailer at the stored SMTP server (if enabled) and
     * returns whether e-mail can be sent at all.
     */
    public static function ready(): bool
    {
        $stored = self::stored();

        if (self::fromApp($stored)) {
            $password = '';
            if (($stored['mail_password'] ?? '') !== '') {
                try {
                    $password = Crypt::decryptString($stored['mail_password']);
                } catch (\Throwable) {
                    $password = '';
                }
            }

            config([
                'mail.default' => 'app_smtp',
                'mail.mailers.app_smtp' => [
                    'transport' => 'smtp',
                    'scheme' => ($stored['mail_encryption'] ?? 'tls') === 'ssl' ? 'smtps' : 'smtp',
                    'host' => $stored['mail_host'],
                    'port' => (int) ($stored['mail_port'] ?: 587),
                    'username' => ($stored['mail_username'] ?? '') ?: null,
                    'password' => $password ?: null,
                    'timeout' => 20,
                    'local_domain' => null,
                ],
                'mail.from' => [
                    'address' => $stored['mail_from_address'],
                    'name' => ($stored['mail_from_name'] ?? '') ?: (Settings::get('company_name') ?: 'Rail CRM'),
                ],
            ]);
            app('mail.manager')->purge('app_smtp');

            return true;
        }

        return self::envReady();
    }

    private static function envReady(): bool
    {
        return !in_array(config('mail.default'), ['log', 'array', null], true);
    }

    private static function fromApp(array $stored): bool
    {
        return ($stored['mail_enabled'] ?? '') === '1'
            && ($stored['mail_host'] ?? '') !== ''
            && ($stored['mail_from_address'] ?? '') !== '';
    }

    /** @return array<string, string> */
    private static function stored(): array
    {
        return DB::table('app_settings')->whereIn('key', self::KEYS)->pluck('value', 'key')
            ->map(fn ($value) => (string) $value)->all();
    }
}
