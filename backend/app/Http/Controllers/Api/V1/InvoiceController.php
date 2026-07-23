<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Support\CurrentUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InvoiceController extends Controller
{
    private array $pairs = [
        'gasfahrt_start' => ['stop' => 'gasfahrt_stop', 'type' => 'gasfahrt', 'rate' => 'travel'],
        'dienstbeginn' => ['stop' => 'arbeit_stop', 'type' => 'arbeit', 'rate' => 'work'],
        'dienstfahrt_start' => ['stop' => 'dienstfahrt_stop', 'type' => 'dienstfahrt', 'rate' => 'travel'],
    ];

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
            return response()->json(['message' => 'Invoice not found.'], 404);
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
            return response()->json(['message' => 'Only manager or admin can create invoice drafts.'], 403);
        }

        $items = $this->approvedCostItems();

        if ($items === []) {
            return response()->json(['message' => 'No approved cost items to invoice.'], 422);
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
            'message' => 'Invoice draft created.',
            'data' => DB::table('invoices')->where('id', $invoiceId)->first(),
            'items' => DB::table('invoice_items')->where('invoice_id', $invoiceId)->get(),
        ], 201);
    }

    private function approvedCostItems(): array
    {
        $events = DB::table('work_events')
            ->whereIn('event_type', ['gasfahrt_start', 'gasfahrt_stop', 'dienstbeginn', 'arbeit_stop', 'dienstfahrt_start', 'dienstfahrt_stop'])
            ->orderBy('employee_id')
            ->orderBy('assignment_id')
            ->orderBy('event_time')
            ->get();

        $open = [];
        $items = [];

        foreach ($events as $event) {
            $key = $event->employee_id.'-'.$event->assignment_id;

            if (isset($this->pairs[$event->event_type])) {
                $open[$key][$event->event_type] = $event;
                continue;
            }

            foreach ($this->pairs as $startType => $pair) {
                if ($event->event_type !== $pair['stop'] || !isset($open[$key][$startType])) {
                    continue;
                }

                $start = $open[$key][$startType];
                $approval = DB::table('work_event_approvals')
                    ->where('employee_id', $event->employee_id)
                    ->where('assignment_id', $event->assignment_id)
                    ->where('pair_type', $pair['type'])
                    ->where('start_time', $start->event_time)
                    ->where('stop_time', $event->event_time)
                    ->where('status', 'approved')
                    ->first();

                if (!$approval) {
                    unset($open[$key][$startType]);
                    continue;
                }

                $alreadyInvoiced = DB::table('invoice_items')->where('approval_id', $approval->id)->exists();
                if ($alreadyInvoiced) {
                    unset($open[$key][$startType]);
                    continue;
                }

                $profile = DB::table('employee_profiles')->where('id', $event->employee_id)->first();
                $seconds = max(0, strtotime($event->event_time) - strtotime($start->event_time));
                $hours = round($seconds / 3600, 2);

                if ($hours <= 0) {
                    unset($open[$key][$startType]);
                    continue;
                }

                $rate = $pair['rate'] === 'travel'
                    ? (float) ($profile->travel_hourly_rate ?? 0)
                    : (float) ($profile->standard_hourly_rate ?? 0);
                $coefficient = $pair['rate'] === 'work' ? $this->coefficient($event, $profile) : 1.0;

                $amount = round($hours * $rate * $coefficient, 2);

                if ($amount <= 0) {
                    unset($open[$key][$startType]);
                    continue;
                }

                $items[] = [
                    'approval_id' => $approval->id,
                    'employee_id' => $event->employee_id,
                    'assignment_id' => $event->assignment_id,
                    'type' => $pair['type'],
                    'hours' => $hours,
                    'hourly_rate' => $rate,
                    'coefficient' => $coefficient,
                    'amount' => $amount,
                ];

                unset($open[$key][$startType]);
            }
        }

        return $items;
    }

    private function coefficient(object $event, ?object $profile): float
    {
        $payload = json_decode($event->payload ?? '{}', true) ?: [];

        if (($payload['is_holiday'] ?? false) === true) {
            return (float) ($profile->holiday_coefficient ?? 1);
        }

        if (($payload['is_sunday'] ?? false) === true) {
            return (float) ($profile->sunday_coefficient ?? 1);
        }

        if (($payload['is_night'] ?? false) === true) {
            return (float) ($profile->night_coefficient ?? 1);
        }

        return 1.0;
    }
}
