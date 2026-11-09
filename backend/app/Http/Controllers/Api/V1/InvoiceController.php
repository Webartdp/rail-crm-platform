<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Support\CurrentUser;
use App\Support\TimeLedger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InvoiceController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => DB::table('invoices')->orderByDesc('id')->limit(100)->get(),
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $invoice = DB::table('invoices')->where('id', $id)->first();

        if (!$invoice) {
            return response()->json(['message' => __('Invoice not found.')], 404);
        }

        return response()->json([
            'data' => $invoice,
            'items' => DB::table('invoice_items')->where('invoice_id', $id)->orderBy('id')->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = CurrentUser::fromRequest($request);
        if (!CurrentUser::hasRole($user, ['manager', 'admin'])) {
            return response()->json(['message' => __('Only manager or admin can create invoice drafts.')], 403);
        }

        $items = array_map(fn (array $line) => [
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
        ], TimeLedger::billableLines());

        if ($items === []) {
            return response()->json(['message' => __('No approved cost items to invoice.')], 422);
        }

        $now = now();
        $total = array_sum(array_map(fn ($item) => $item['amount'], $items));
        $number = 'INV-'.$now->format('Ymd-His');

        $invoiceId = DB::table('invoices')->insertGetId([
            'number' => $number,
            'status' => 'draft',
            'total_amount' => round($total, 2),
            'issued_at' => $now->toDateString(),
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        foreach ($items as $item) {
            DB::table('invoice_items')->insert(array_merge($item, [
                'invoice_id' => $invoiceId,
                'created_at' => $now,
                'updated_at' => $now,
            ]));
        }

        foreach (array_unique(array_column($items, 'assignment_id')) as $assignmentId) {
            DB::table('work_orders')->where('id', $assignmentId)->update([
                'status' => 'invoiced',
                'updated_at' => $now,
            ]);
        }

        DB::table('audit_logs')->insert([
            'user_id' => $user->id,
            'action' => 'invoice_created',
            'entity_type' => 'invoice',
            'entity_id' => $invoiceId,
            'payload' => json_encode(['number' => $number, 'total_amount' => round($total, 2)]),
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        return response()->json([
            'message' => __('Invoice draft created.'),
            'data' => DB::table('invoices')->where('id', $invoiceId)->first(),
            'items' => DB::table('invoice_items')->where('invoice_id', $invoiceId)->get(),
        ], 201);
    }
}
