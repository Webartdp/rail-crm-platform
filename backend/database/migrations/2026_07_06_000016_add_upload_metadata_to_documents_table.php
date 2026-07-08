<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->string('original_filename')->nullable()->after('file_path');
            $table->string('mime_type', 120)->nullable()->after('original_filename');
            $table->unsignedBigInteger('size_bytes')->nullable()->after('mime_type');
            $table->unsignedBigInteger('uploaded_by')->nullable()->index()->after('size_bytes');
        });
    }

    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->dropColumn(['original_filename', 'mime_type', 'size_bytes', 'uploaded_by']);
        });
    }
};
