<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Support\Settings;
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
}
