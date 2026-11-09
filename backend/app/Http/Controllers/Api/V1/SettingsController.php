<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Support\MailSettings;
use App\Support\Settings;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Company data printed on invoices. */
class SettingsController extends Controller
{
    public function company(): JsonResponse
    {
        return response()->json(['data' => Settings::company()]);
    }

    public function updateCompany(Request $request): JsonResponse
    {
        $data = $request->validate([
            'company_name' => ['nullable', 'string', 'max:255'],
            'company_address' => ['nullable', 'string', 'max:1000'],
            'company_email' => ['nullable', 'email', 'max:255'],
            'company_phone' => ['nullable', 'string', 'max:100'],
            'company_website' => ['nullable', 'string', 'max:255'],
            'tax_number' => ['nullable', 'string', 'max:100'],
            'vat_id' => ['nullable', 'string', 'max:100'],
            'bank_name' => ['nullable', 'string', 'max:255'],
            'iban' => ['nullable', 'string', 'max:64'],
            'bic' => ['nullable', 'string', 'max:32'],
            'invoice_prefix' => ['nullable', 'string', 'max:20'],
            'vat_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'payment_terms_days' => ['nullable', 'integer', 'min:0', 'max:365'],
            'invoice_footer' => ['nullable', 'string', 'max:2000'],
            'invoice_intro' => ['nullable', 'string', 'max:2000'],
            'surcharge_mode' => ['nullable', 'in:max,sum'],
        ]);

        Settings::put(array_map(fn ($value) => $value === null ? '' : (string) $value, $data));

        return response()->json(['message' => __('Company data saved.'), 'data' => Settings::company()]);
    }

    public function mail(): JsonResponse
    {
        return response()->json(['data' => MailSettings::forForm()]);
    }

    public function updateMail(Request $request): JsonResponse
    {
        $data = $request->validate([
            'mail_enabled' => ['required', 'boolean'],
            'mail_host' => ['nullable', 'required_if:mail_enabled,true', 'string', 'max:255'],
            'mail_port' => ['nullable', 'required_if:mail_enabled,true', 'integer', 'min:1', 'max:65535'],
            'mail_encryption' => ['nullable', 'in:tls,ssl'],
            'mail_username' => ['nullable', 'string', 'max:255'],
            'mail_password' => ['nullable', 'string', 'max:500'],
            'mail_password_clear' => ['nullable', 'boolean'],
            'mail_from_address' => ['nullable', 'required_if:mail_enabled,true', 'email', 'max:255'],
            'mail_from_name' => ['nullable', 'string', 'max:255'],
        ]);

        MailSettings::save($data);

        return response()->json(['message' => __('E-mail settings saved.'), 'data' => MailSettings::forForm()]);
    }

    /** Sends a short test message with the saved settings. */
    public function testMail(Request $request): JsonResponse
    {
        $data = $request->validate(['to' => ['required', 'email', 'max:255']]);

        if (!MailSettings::ready()) {
            return response()->json(['message' => __('E-mail is not set up yet. Save the SMTP settings and switch sending on.')], 422);
        }

        try {
            Mail::raw(__('This is a test message from Rail CRM. E-mail sending works.'), function ($message) use ($data) {
                $message->to($data['to'])->subject(__('Rail CRM test e-mail'));
            });
        } catch (\Throwable $exception) {
            Log::warning('Test mail failed', ['error' => $exception->getMessage()]);

            return response()->json(['message' => __('The e-mail could not be sent: :error', ['error' => $exception->getMessage()])], 502);
        }

        return response()->json(['message' => __('Test e-mail sent to :email. Check the inbox (and the spam folder).', ['email' => $data['to']])]);
    }
}
