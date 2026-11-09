<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

/** Key/value settings (company data for invoices etc.). */
class Settings
{
    public const COMPANY_KEYS = [
        'company_name', 'company_address', 'company_email', 'company_phone', 'company_website',
        'tax_number', 'vat_id', 'bank_name', 'iban', 'bic',
        'invoice_prefix', 'vat_rate', 'payment_terms_days', 'invoice_footer', 'invoice_intro', 'surcharge_mode',
    ];

    public const DEFAULTS = [
        'invoice_prefix' => 'RE',
        'surcharge_mode' => 'max',
        'vat_rate' => '19',
        'payment_terms_days' => '14',
        'invoice_intro' => 'Für die folgenden Leistungen erlauben wir uns, Ihnen in Rechnung zu stellen:',
    ];

    /** @return array<string, string> */
    public static function company(): array
    {
        $stored = DB::table('app_settings')->whereIn('key', self::COMPANY_KEYS)->pluck('value', 'key')->all();
        $values = [];
        foreach (self::COMPANY_KEYS as $key) {
            $values[$key] = (string) ($stored[$key] ?? self::DEFAULTS[$key] ?? '');
        }

        return $values;
    }

    public static function get(string $key, ?string $default = null): ?string
    {
        $value = DB::table('app_settings')->where('key', $key)->value('value');

        return $value ?? self::DEFAULTS[$key] ?? $default;
    }

    public static function put(array $values): void
    {
        $now = now();
        foreach ($values as $key => $value) {
            DB::table('app_settings')->updateOrInsert(['key' => $key], ['value' => $value, 'updated_at' => $now, 'created_at' => $now]);
        }
    }
}
