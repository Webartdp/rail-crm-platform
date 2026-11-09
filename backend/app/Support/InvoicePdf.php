<?php

namespace App\Support;

use App\Support\Pdf\PdfDocument;
use Illuminate\Support\Facades\DB;

/** German invoice (Rechnung) as PDF, built from the stored invoice and its items. */
class InvoicePdf
{
    private const INK = [0.06, 0.11, 0.18];
    private const SLATE = [0.36, 0.41, 0.47];
    private const BRASS = [0.69, 0.54, 0.24];
    private const LINE = [0.86, 0.89, 0.92];

    private const ZONES = [
        'day' => 'Tagstunden 06–20',
        'night_20_24' => 'Nacht 20–24',
        'night_00_04' => 'Nacht 00–04',
        'night_04_06' => 'Nacht 04–06',
    ];

    private const TYPES = ['arbeit' => 'Arbeitszeit', 'gasfahrt' => 'Anfahrt', 'dienstfahrt' => 'Dienstfahrt'];

    public static function filename(object $invoice): string
    {
        return 'Rechnung_'.preg_replace('/[^A-Za-z0-9\-]+/', '_', (string) $invoice->number).'.pdf';
    }

    public static function render(int $invoiceId): string
    {
        $invoice = DB::table('invoices')->where('id', $invoiceId)->first();
        $client = $invoice->client_id ? DB::table('clients')->where('id', $invoice->client_id)->first() : null;
        $company = Settings::company();
        $items = self::items($invoiceId);

        $pdf = new PdfDocument();
        $pdf->setTitle('Rechnung '.$invoice->number);
        $left = 56;
        $right = PdfDocument::WIDTH - 56;

        // Sender line and company block
        $pdf->font('bold', 15)->text($left, 64, $company['company_name'] ?: 'Rail CRM');
        $pdf->font('regular', 8.5);
        $y = 64;
        foreach (array_filter([...preg_split('/\R/u', $company['company_address']), $company['company_phone'], $company['company_email'], $company['company_website']]) as $line) {
            $pdf->text($right, $y, $line, 'right', self::SLATE);
            $y += 11;
        }
        $pdf->line($left, 104, $left + 40, 104, 1.5, self::BRASS);

        // Recipient
        $senderLine = implode(' · ', array_filter([
            trim((string) $company['company_name']),
            trim(str_replace(["\r\n", "\n"], ', ', (string) $company['company_address'])),
        ]));
        if ($senderLine !== '') {
            $pdf->font('regular', 7.5)->text($left, 136, $senderLine, 'left', self::SLATE);
        }
        $pdf->font('regular', 10.5);
        $y = 156;
        foreach (array_filter([$client->name ?? '', $client->contact_person ?? null, ...preg_split('/\R/u', (string) ($client->address ?? '')), $client->city ?? null]) as $line) {
            $pdf->text($left, $y, $line);
            $y += 14;
        }

        // Invoice meta
        $meta = [
            'Rechnungsnummer' => $invoice->number,
            'Rechnungsdatum' => self::date($invoice->issued_at),
            'Leistungszeitraum' => $invoice->period_from ? self::date($invoice->period_from).' – '.self::date($invoice->period_to) : self::period($items),
            'Fällig am' => self::date($invoice->due_at),
        ];
        $y = 156;
        foreach ($meta as $label => $value) {
            $pdf->font('regular', 9)->text($right - 120, $y, $label, 'right', self::SLATE);
            $pdf->font('bold', 9)->text($right, $y, (string) $value, 'right');
            $y += 14;
        }

        $pdf->font('bold', 20)->text($left, 262, 'Rechnung '.$invoice->number);
        $y = $pdf->font('regular', 10)->paragraph($left, 286, $right - $left, $company['invoice_intro'] ?: Settings::DEFAULTS['invoice_intro']);

        // Table
        $columns = ['pos' => $left, 'desc' => $left + 26, 'qty' => $right - 190, 'rate' => $right - 130, 'factor' => $right - 78, 'amount' => $right];
        $y += 14;
        $drawHeader = function (float $y) use ($pdf, $columns, $left, $right): float {
            $pdf->rect($left, $y - 12, $right - $left, 20, [0.957, 0.965, 0.976]);
            $pdf->font('bold', 8.5);
            $pdf->text($columns['pos'] + 4, $y + 1, 'Pos.', 'left', self::SLATE);
            $pdf->text($columns['desc'], $y + 1, 'Leistung', 'left', self::SLATE);
            $pdf->text($columns['qty'], $y + 1, 'Std.', 'right', self::SLATE);
            $pdf->text($columns['rate'], $y + 1, 'Satz €', 'right', self::SLATE);
            $pdf->text($columns['factor'], $y + 1, 'Faktor', 'right', self::SLATE);
            $pdf->text($columns['amount'] - 4, $y + 1, 'Betrag €', 'right', self::SLATE);

            return $y + 24;
        };
        $y = $drawHeader($y);

        $position = 0;
        foreach ($items as $item) {
            $position++;
            $title = trim($item['work_title'].($item['reference'] ? ' · '.$item['reference'] : ''));
            $detail = trim(self::date($item['date']).' · '.$item['employee'].' · '.$item['label'].($item['object'] ? ' · '.$item['object'] : ''));
            $pdf->font('regular', 9);
            $detailLines = $pdf->wrap($detail, $columns['qty'] - $columns['desc'] - 60);
            $rowHeight = 13 + 11 * count($detailLines) + 6;

            if ($y + $rowHeight > PdfDocument::HEIGHT - 150) {
                self::footer($pdf, $company, $left, $right);
                $pdf->addPage();
                $y = $drawHeader(70);
            }

            $pdf->font('regular', 9)->text($columns['pos'] + 4, $y, (string) $position, 'left', self::SLATE);
            $pdf->font('bold', 9)->text($columns['desc'], $y, $title !== '' ? $title : $item['label']);
            $pdf->font('regular', 9);
            $pdf->text($columns['qty'], $y, self::number($item['hours']), 'right');
            $pdf->text($columns['rate'], $y, self::number($item['rate']), 'right');
            $pdf->text($columns['factor'], $y, self::number($item['coefficient'], 2), 'right');
            $pdf->text($columns['amount'] - 4, $y, self::number($item['amount']), 'right');
            $lineY = $y + 12;
            foreach ($detailLines as $line) {
                $pdf->font('regular', 8)->text($columns['desc'], $lineY, $line, 'left', self::SLATE);
                $lineY += 11;
            }
            $y += $rowHeight;
            $pdf->line($left, $y - 10, $right, $y - 10, 0.4, self::LINE);
        }

        if ($y > PdfDocument::HEIGHT - 230) {
            self::footer($pdf, $company, $left, $right);
            $pdf->addPage();
            $y = 80;
        }

        // Totals
        $y += 6;
        $totals = [
            ['Nettobetrag', (float) $invoice->total_amount, false],
            ['zzgl. USt. '.self::number((float) $invoice->vat_rate, (float) $invoice->vat_rate == floor((float) $invoice->vat_rate) ? 0 : 2).' %', (float) $invoice->vat_amount, false],
            ['Rechnungsbetrag', (float) $invoice->gross_amount, true],
        ];
        foreach ($totals as [$label, $value, $strong]) {
            if ($strong) {
                $pdf->line($right - 220, $y - 11, $right, $y - 11, 1, self::INK);
                $y += 4;
            }
            $pdf->font($strong ? 'bold' : 'regular', $strong ? 11 : 9.5)->text($right - 110, $y, $label, 'right', $strong ? self::INK : self::SLATE);
            $pdf->text($right - 4, $y, self::number($value).' €', 'right');
            $y += $strong ? 18 : 15;
        }

        $y += 16;
        $terms = sprintf(
            'Bitte überweisen Sie den Rechnungsbetrag bis zum %s unter Angabe der Rechnungsnummer %s.',
            self::date($invoice->due_at),
            $invoice->number,
        );
        $y = $pdf->font('regular', 9.5)->paragraph($left, $y, $right - $left, $terms);
        if ($invoice->notes) {
            $pdf->font('regular', 9.5)->paragraph($left, $y + 6, $right - $left, (string) $invoice->notes, 1.35, self::SLATE);
        }

        self::footer($pdf, $company, $left, $right);

        return $pdf->output();
    }

    /** @return array<int, array<string, mixed>> */
    public static function items(int $invoiceId): array
    {
        $rows = DB::table('invoice_items')
            ->leftJoin('work_event_approvals', 'work_event_approvals.id', '=', 'invoice_items.approval_id')
            ->leftJoin('work_orders', 'work_orders.id', '=', 'invoice_items.assignment_id')
            ->leftJoin('employee_profiles', 'employee_profiles.id', '=', 'invoice_items.employee_id')
            ->where('invoice_items.invoice_id', $invoiceId)
            ->orderBy('work_event_approvals.start_time')
            ->orderBy('invoice_items.id')
            ->get([
                'invoice_items.*',
                'work_event_approvals.start_time',
                'work_orders.reference_number',
                'work_orders.title as order_title',
                'work_orders.details',
                'employee_profiles.first_name',
                'employee_profiles.last_name',
            ]);

        return $rows->map(function ($row) {
            $details = json_decode((string) $row->details, true) ?: [];
            $label = self::TYPES[$row->type] ?? $row->type;
            if ($row->type === 'arbeit' && $row->tariff_zone) {
                $label = self::ZONES[$row->tariff_zone] ?? $label;
                if ($row->day_type === 'sunday') {
                    $label .= ', Sonntag';
                } elseif ($row->day_type === 'holiday') {
                    $label .= ', Feiertag';
                }
            }

            return [
                'id' => (int) $row->id,
                'date' => $row->start_time ? substr((string) $row->start_time, 0, 10) : null,
                'employee' => trim(($row->first_name ?? '').' '.($row->last_name ?? '')) ?: '#'.$row->employee_id,
                'employee_id' => (int) $row->employee_id,
                'assignment_id' => (int) $row->assignment_id,
                'work_title' => (string) ($details['work_title'] ?? $row->order_title ?? ''),
                'reference' => (string) ($row->reference_number ?? ''),
                'object' => (string) ($details['object_name'] ?? ''),
                'type' => $row->type,
                'tariff_zone' => $row->tariff_zone,
                'day_type' => $row->day_type,
                'label' => $label,
                'hours' => (float) $row->hours,
                'rate' => (float) $row->hourly_rate,
                'coefficient' => (float) $row->coefficient,
                'amount' => (float) $row->amount,
            ];
        })->all();
    }

    private static function footer(PdfDocument $pdf, array $company, float $left, float $right): void
    {
        $y = PdfDocument::HEIGHT - 70;
        $pdf->line($left, $y - 14, $right, $y - 14, 0.5, self::LINE);
        $columns = [
            array_filter([$company['company_name'], ...preg_split('/\R/u', $company['company_address'])]),
            array_filter([$company['tax_number'] ? 'Steuernr.: '.$company['tax_number'] : null, $company['vat_id'] ? 'USt-IdNr.: '.$company['vat_id'] : null, $company['company_email']]),
            array_filter([$company['bank_name'], $company['iban'] ? 'IBAN: '.$company['iban'] : null, $company['bic'] ? 'BIC: '.$company['bic'] : null]),
        ];
        $width = ($right - $left) / 3;
        foreach ($columns as $index => $lines) {
            $lineY = $y;
            foreach (array_slice($lines, 0, 4) as $line) {
                $pdf->font('regular', 7)->text($left + $index * $width, $lineY, (string) $line, 'left', self::SLATE);
                $lineY += 9;
            }
        }
        if ($company['invoice_footer']) {
            $pdf->font('regular', 7)->text($left, PdfDocument::HEIGHT - 28, $company['invoice_footer'], 'left', self::SLATE);
        }
        $pdf->font('regular', 7)->text($right, PdfDocument::HEIGHT - 28, 'Seite '.$pdf->pageCount(), 'right', self::SLATE);
    }

    private static function date(?string $value): string
    {
        return $value ? date('d.m.Y', strtotime($value)) : '—';
    }

    private static function period(array $items): string
    {
        $dates = array_filter(array_column($items, 'date'));
        if (!$dates) {
            return '—';
        }

        return self::date(min($dates)).' – '.self::date(max($dates));
    }

    private static function number(float $value, int $decimals = 2): string
    {
        return number_format($value, $decimals, ',', '.');
    }
}
