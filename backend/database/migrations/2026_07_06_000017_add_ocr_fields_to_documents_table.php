<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->string('ocr_status', 50)->default('not_started')->index()->after('uploaded_by');
            $table->longText('extracted_text')->nullable()->after('ocr_status');
            $table->timestamp('ocr_processed_at')->nullable()->after('extracted_text');
        });
    }

    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->dropColumn(['ocr_status', 'extracted_text', 'ocr_processed_at']);
        });
    }
};
