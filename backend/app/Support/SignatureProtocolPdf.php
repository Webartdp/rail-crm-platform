<?php

namespace App\Support;

use App\Support\Pdf\PdfDocument;
use Illuminate\Support\Facades\DB;

/**
 * "Unterschriftsprotokoll": PDF with the document data, the SHA-256 fingerprint of
 * the stored file, the signatures (typed text or drawn image) and their timestamps.
 */
class SignatureProtocolPdf
{
    private const SLATE = [0.36, 0.41, 0.47];
    private const BRASS = [0.69, 0.54, 0.24];

    public static function render(int $documentId): string
    {
        $document = DB::table('documents')->where('id', $documentId)->first();
        $order = $document->work_order_id ? DB::table('work_orders')->where('id', $document->work_order_id)->first() : null;
        $details = $order ? (json_decode((string) $order->details, true) ?: []) : [];
        $signatures = DB::table('document_signatures')->where('document_id', $documentId)->orderBy('id')->get();
        $company = Settings::company();

        $filePath = $document->file_path ? storage_path('app/'.$document->file_path) : null;
        $hash = $filePath && is_file($filePath) ? hash_file('sha256', $filePath) : null;

        $pdf = new PdfDocument();
        $pdf->setTitle('Unterschriftsprotokoll '.$document->title);
        $left = 56;
        $right = PdfDocument::WIDTH - 56;

        $pdf->font('regular', 9)->text($left, 56, $company['company_name'] ?: 'Rail CRM', 'left', self::SLATE);
        $pdf->font('bold', 18)->text($left, 86, 'Unterschriftsprotokoll');
        $pdf->line($left, 96, $left + 40, 96, 1.5, self::BRASS);
        $pdf->font('bold', 12)->text($left, 122, (string) $document->title);

        $rows = [
            'Dokument-ID' => (string) $document->id,
            'Datei' => (string) ($document->original_filename ?: '—'),
            'SHA-256 der Datei' => $hash ?: '—',
            'Auftrag' => $order ? trim(($order->reference_number ?: '#'.$order->id).' · '.($details['work_title'] ?? $order->title)) : '—',
            'Kunde / Objekt' => trim(($details['customer_name'] ?? '').' / '.($details['object_name'] ?? ''), ' /') ?: '—',
            'Erstellt am' => date('d.m.Y H:i', strtotime((string) $document->created_at)),
        ];
        $y = 146;
        foreach ($rows as $label => $value) {
            $pdf->font('regular', 9)->text($left, $y, $label, 'left', self::SLATE);
            $y = $pdf->font($label === 'SHA-256 der Datei' ? 'regular' : 'bold', $label === 'SHA-256 der Datei' ? 8 : 9.5)->paragraph($left + 130, $y, $right - $left - 130, $value) + 3;
        }

        $y += 14;
        $pdf->font('bold', 12)->text($left, $y, 'Unterschriften');
        $y += 20;

        if ($signatures->isEmpty()) {
            $pdf->font('regular', 10)->text($left, $y, 'Keine Unterschriften vorhanden.', 'left', self::SLATE);
        }

        foreach ($signatures as $signature) {
            if ($y > PdfDocument::HEIGHT - 190) {
                $pdf->addPage();
                $y = 70;
            }
            $pdf->rect($left, $y - 14, $right - $left, 150, null, [0.86, 0.89, 0.92]);
            $status = ['signed' => 'Unterschrieben', 'rejected' => 'Abgelehnt', 'pending' => 'Ausstehend'][$signature->status] ?? $signature->status;
            $pdf->font('bold', 10.5)->text($left + 12, $y + 2, trim(($signature->signer_name ?: '—').($signature->signer_email ? ' · '.$signature->signer_email : '')));
            $pdf->font('regular', 9)->text($right - 12, $y + 2, $status, 'right', $signature->status === 'signed' ? [0.12, 0.48, 0.30] : self::SLATE);
            $stamp = array_filter([
                $signature->requested_at ? 'Angefordert: '.date('d.m.Y H:i', strtotime($signature->requested_at)) : null,
                $signature->signed_at ? 'Unterschrieben: '.date('d.m.Y H:i', strtotime($signature->signed_at)) : null,
                $signature->rejected_at ? 'Abgelehnt: '.date('d.m.Y H:i', strtotime($signature->rejected_at)) : null,
            ]);
            $pdf->font('regular', 8.5)->text($left + 12, $y + 18, implode(' · ', $stamp), 'left', self::SLATE);

            $data = (string) ($signature->signature_data ?? '');
            $drawn = $data !== '' && str_starts_with($data, 'data:image/') && $pdf->imageFromDataUrl($data, $left + 12, $y + 30, 200);
            if (!$drawn && $data !== '' && !str_starts_with($data, 'data:image/')) {
                $pdf->font('bold', 16)->text($left + 12, $y + 70, mb_substr($data, 0, 80));
            } elseif (!$drawn && $data !== '') {
                $pdf->font('regular', 9)->text($left + 12, $y + 70, 'Handschriftliche Unterschrift gespeichert (Bild im CRM).', 'left', self::SLATE);
            }
            $pdf->line($left + 12, $y + 118, $left + 232, $y + 118, 0.6, self::SLATE);
            $pdf->font('regular', 7.5)->text($left + 12, $y + 128, 'Unterschrift', 'left', self::SLATE);
            $y += 166;
        }

        $pdf->font('regular', 7.5)->text($left, PdfDocument::HEIGHT - 30, 'Erstellt am '.date('d.m.Y H:i').' mit Rail CRM. Der SHA-256-Wert belegt, welche Datei unterschrieben wurde.', 'left', self::SLATE);

        return $pdf->output();
    }
}
