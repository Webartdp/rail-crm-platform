<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Support\CurrentUser;
use App\Support\InvoicePdf;
use App\Support\Settings;
use App\Support\TimeLedger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Symfony\Component\HttpFoundation\Response;

class InvoiceController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => DB::table('invoices')
                ->leftJoin('clients', 'clients.id', '=', 'invoices.client_id')
                ->select('invoices.*', 'clients.name as client_name', 'clients.email as client_email')
                ->orderByDesc('invoices.id')
                ->limit(300)
                ->get(),
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $invoice = DB::table('invoices')
            ->leftJoin('clients', 'clients.id', '=', 'invoices.client_id')
            ->select('invoices.*', 'clients.name as client_name', 'clients.email as client_email')
            ->where('invoices.id', $id)
            ->first();

        if (!$invoice) {
            return response()->json(['message' => __('Invoice not found.')], 404);
        }

        return response()->json([
            'data' => $invoice,
            'items' => DB::table('invoice_items')->where('invoice_id', $id)->orderBy('id')->get(),
            'lines' => InvoicePdf::items($id),
        ]);
    }

    /** Billable (approved, not invoiced) lines grouped by client — what the billing page offers to invoice. */
    public function billable(): JsonResponse
    {
        $lines = TimeLedger::billableLines();
        $clients = $this->clientsOfOrders(array_column($lines, 'assignment_id'));

        $groups = [];
        foreach ($lines as $line) {
            $clientId = $clients[$line['assignment_id']] ?? 0;
            $groups[$clientId] ??= ['client_id' => $clientId ?: null, 'lines' => 0, 'hours' => 0.0, 'amount' => 0.0, 'from' => null, 'to' => null];
            $date = substr((string) $line['start_time'], 0, 10);
            $groups[$clientId]['lines']++;
            $groups[$clientId]['hours'] += $line['hours'];
            $groups[$clientId]['amount'] += $line['amount'];
            $groups[$clientId]['from'] = $groups[$clientId]['from'] === null || $date < $groups[$clientId]['from'] ? $date : $groups[$clientId]['from'];
            $groups[$clientId]['to'] = $groups[$clientId]['to'] === null || $date > $groups[$clientId]['to'] ? $date : $groups[$clientId]['to'];
        }

        $names = DB::table('clients')->whereIn('id', array_filter(array_keys($groups)))->pluck('name', 'id');
        $result = [];
        foreach ($groups as $clientId => $group) {
            $group['client_name'] = $names[$clientId] ?? null;
            $group['amount'] = round($group['amount'], 2);
            $group['hours'] = round($group['hours'], 2);
            $result[] = $group;
        }

        return response()->json(['data' => $result]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = CurrentUser::fromRequest($request);
        if (!CurrentUser::hasRole($user, ['manager', 'admin'])) {
            return response()->json(['message' => __('Only manager or admin can create invoice drafts.')], 403);
        }

        $data = $request->validate([
            'client_id' => ['nullable', 'integer'],
            'period_from' => ['nullable', 'date'],
            'period_to' => ['nullable', 'date'],
        ]);
        $filterByClient = $request->has('client_id');
        $clientId = !empty($data['client_id']) ? (int) $data['client_id'] : null;

        $lines = TimeLedger::billableLines();
        $clients = $this->clientsOfOrders(array_column($lines, 'assignment_id'));
        $lines = array_values(array_filter($lines, function (array $line) use ($clients, $clientId, $data, $filterByClient) {
            $date = substr((string) $line['start_time'], 0, 10);
            if ($filterByClient && ($clients[$line['assignment_id']] ?? null) !== $clientId) {
                return false;
            }
            if (!empty($data['period_from']) && $date < $data['period_from']) {
                return false;
            }
            if (!empty($data['period_to']) && $date > $data['period_to']) {
                return false;
            }

            return true;
        }));

        if ($lines === []) {
            return response()->json(['message' => __('No approved cost items to invoice.')], 422);
        }

        $now = now();
        $net = round(array_sum(array_column($lines, 'amount')), 2);
        $vatRate = (float) Settings::get('vat_rate', '19');
        $vat = round($net * $vatRate / 100, 2);
        $dates = array_map(fn ($line) => substr((string) $line['start_time'], 0, 10), $lines);

        $invoiceId = DB::transaction(function () use ($lines, $clientId, $now, $net, $vatRate, $vat, $dates, $user) {
            $id = DB::table('invoices')->insertGetId([
                'client_id' => $clientId,
                'number' => $this->nextNumber(),
                'status' => 'draft',
                'total_amount' => $net,
                'vat_rate' => $vatRate,
                'vat_amount' => $vat,
                'gross_amount' => round($net + $vat, 2),
                'issued_at' => $now->toDateString(),
                'due_at' => $now->copy()->addDays((int) Settings::get('payment_terms_days', '14'))->toDateString(),
                'period_from' => min($dates),
                'period_to' => max($dates),
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            foreach ($lines as $line) {
                DB::table('invoice_items')->insert([
                    'invoice_id' => $id,
                    'approval_id' => $line['approval_id'],
                    'employee_id' => $line['employee_id'],
                    'assignment_id' => $line['assignment_id'],
                    'type' => $line['type'],
                    'tariff_zone' => $line['tariff_zone'],
                    'day_type' => $line['day_type'],
                    'hours' => $line['hours'],
                    'hourly_rate' => $line['hourly_rate'],
                    'coefficient' => $line['coefficient'],
                    'amount' => $line['amount'],
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }

            DB::table('work_orders')->whereIn('id', array_unique(array_column($lines, 'assignment_id')))->update(['status' => 'invoiced', 'updated_at' => $now]);
            $this->audit($user, 'invoice_created', $id, ['total_amount' => $net]);

            return $id;
        });

        return response()->json([
            'message' => __('Invoice draft created.'),
            'data' => DB::table('invoices')->where('id', $invoiceId)->first(),
        ], 201);
    }

    /** Change status (sent, paid, draft), due date or notes. */
    public function update(Request $request, int $id): JsonResponse
    {
        $invoice = DB::table('invoices')->where('id', $id)->first();
        if (!$invoice) {
            return response()->json(['message' => __('Invoice not found.')], 404);
        }

        $data = $request->validate([
            'status' => ['sometimes', 'in:draft,sent,paid'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'due_at' => ['sometimes', 'date'],
        ]);

        $changes = $data + ['updated_at' => now()];
        if (($data['status'] ?? null) === 'paid') {
            $changes['paid_at'] = now()->toDateString();
        }
        DB::table('invoices')->where('id', $id)->update($changes);
        $this->audit(CurrentUser::fromRequest($request), 'invoice_updated', $id, $data);

        return response()->json(['message' => __('Invoice saved.'), 'data' => DB::table('invoices')->where('id', $id)->first()]);
    }

    /** Deletes a draft; its time becomes billable again. */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $invoice = DB::table('invoices')->where('id', $id)->first();
        if (!$invoice) {
            return response()->json(['message' => __('Invoice not found.')], 404);
        }
        if ($invoice->status !== 'draft') {
            return response()->json(['message' => __('Only draft invoices can be deleted.')], 422);
        }

        DB::transaction(function () use ($id, $request) {
            $orderIds = DB::table('invoice_items')->where('invoice_id', $id)->distinct()->pluck('assignment_id');
            DB::table('invoice_items')->where('invoice_id', $id)->delete();
            DB::table('invoices')->where('id', $id)->delete();
            DB::table('work_orders')->whereIn('id', $orderIds)->where('status', 'invoiced')->update(['status' => 'approved', 'updated_at' => now()]);
            $this->audit(CurrentUser::fromRequest($request), 'invoice_deleted', $id, []);
        });

        return response()->json(['message' => __('Invoice deleted.')]);
    }

    public function pdf(int $id): Response
    {
        $invoice = DB::table('invoices')->where('id', $id)->first();
        if (!$invoice) {
            return response()->json(['message' => __('Invoice not found.')], 404);
        }

        return response(InvoicePdf::render($id), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.InvoicePdf::filename($invoice).'"',
            'Cache-Control' => 'no-store',
        ]);
    }

    /** E-mails the invoice PDF to the client and marks it as sent. */
    public function send(Request $request, int $id): JsonResponse
    {
        $invoice = DB::table('invoices')->where('id', $id)->first();
        if (!$invoice) {
            return response()->json(['message' => __('Invoice not found.')], 404);
        }

        $data = $request->validate([
            'to' => ['required', 'email', 'max:255'],
            'message' => ['nullable', 'string', 'max:5000'],
        ]);

        if (in_array(config('mail.default'), ['log', 'array', null], true)) {
            return response()->json(['message' => __('E-mail sending is not configured on the server. Download the PDF and send it yourself.')], 422);
        }

        $company = Settings::company();
        $subject = 'Rechnung '.$invoice->number.($company['company_name'] ? ' – '.$company['company_name'] : '');
        $body = $data['message'] ?: "Sehr geehrte Damen und Herren,\n\nanbei erhalten Sie unsere Rechnung {$invoice->number}.\n\nMit freundlichen Grüßen\n".($company['company_name'] ?: '');
        $pdf = InvoicePdf::render($id);

        try {
            Mail::raw($body, function ($message) use ($data, $subject, $pdf, $invoice, $company) {
                $message->to($data['to'])->subject($subject)->attachData($pdf, InvoicePdf::filename($invoice), ['mime' => 'application/pdf']);
                if ($company['company_email']) {
                    $message->replyTo($company['company_email']);
                }
            });
        } catch (\Throwable $exception) {
            Log::warning('Invoice mail failed', ['invoice' => $id, 'error' => $exception->getMessage()]);

            return response()->json(['message' => __('The e-mail could not be sent: :error', ['error' => $exception->getMessage()])], 502);
        }

        DB::table('invoices')->where('id', $id)->update([
            'status' => $invoice->status === 'paid' ? 'paid' : 'sent',
            'sent_at' => now(),
            'sent_to' => $data['to'],
            'updated_at' => now(),
        ]);
        $this->audit(CurrentUser::fromRequest($request), 'invoice_sent', $id, ['to' => $data['to']]);

        return response()->json(['message' => __('Invoice sent to :email.', ['email' => $data['to']])]);
    }

    /** @return array<int, int|null> work order id => client id */
    private function clientsOfOrders(array $orderIds): array
    {
        $orderIds = array_values(array_unique(array_filter($orderIds)));

        return $orderIds === [] ? [] : DB::table('work_orders')->whereIn('id', $orderIds)->pluck('client_id', 'id')
            ->map(fn ($id) => $id !== null ? (int) $id : null)->all();
    }

    private function nextNumber(): string
    {
        $prefix = trim((string) Settings::get('invoice_prefix', 'RE')) ?: 'RE';
        $year = now()->format('Y');
        $sequence = DB::table('invoices')->where('number', 'like', "{$prefix}-{$year}-%")->count() + 1;
        do {
            $number = sprintf('%s-%s-%04d', $prefix, $year, $sequence++);
        } while (DB::table('invoices')->where('number', $number)->exists());

        return $number;
    }

    private function audit(?object $user, string $action, int $invoiceId, array $payload): void
    {
        DB::table('audit_logs')->insert([
            'user_id' => $user?->id,
            'action' => $action,
            'entity_type' => 'invoice',
            'entity_id' => $invoiceId,
            'payload' => json_encode($payload, JSON_UNESCAPED_UNICODE),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
