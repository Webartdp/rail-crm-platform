<?php

use App\Support\Ocr;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

Artisan::command('app:status', function () {
    $this->info('Rail CRM backend is available.');
});

// Runs queued OCR jobs. Called every minute from cron:
// * * * * * cd /path/to/backend && php8.3 artisan documents:ocr >/dev/null 2>&1
Artisan::command('documents:ocr {--limit=10}', function () {
    if (!Ocr::canRunHere()) {
        $this->error('proc_open is disabled for this PHP binary.');

        return 1;
    }

    $documents = DB::table('documents')->where('ocr_status', 'queued')->orderBy('updated_at')->limit((int) $this->option('limit'))->get();
    foreach ($documents as $document) {
        $path = $document->file_path ? storage_path('app/'.$document->file_path) : null;
        $now = now();
        if (!$path || !is_file($path)) {
            DB::table('documents')->where('id', $document->id)->update(['ocr_status' => 'failed', 'updated_at' => $now]);
            continue;
        }

        $text = Ocr::extract($path, $document->mime_type);
        DB::table('documents')->where('id', $document->id)->update([
            'ocr_status' => $text === null ? 'pending' : ($text === '' ? 'failed' : 'done'),
            'extracted_text' => $text ?: $document->extracted_text,
            'ocr_processed_at' => $now,
            'updated_at' => $now,
        ]);
        $this->line("Document {$document->id}: ".($text === null ? 'no OCR tools' : ($text === '' ? 'no text' : mb_strlen($text).' chars')));
    }

    return 0;
})->purpose('Recognise text in documents queued for OCR');
