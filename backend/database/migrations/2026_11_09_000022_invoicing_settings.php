<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('app_settings', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->text('value')->nullable();
            $table->timestamps();
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->decimal('vat_rate', 5, 2)->default(19)->after('total_amount');
            $table->decimal('vat_amount', 12, 2)->default(0)->after('vat_rate');
            $table->decimal('gross_amount', 12, 2)->default(0)->after('vat_amount');
            $table->date('due_at')->nullable()->after('issued_at');
            $table->date('period_from')->nullable()->after('due_at');
            $table->date('period_to')->nullable()->after('period_from');
            $table->timestamp('sent_at')->nullable()->after('paid_at');
            $table->string('sent_to')->nullable()->after('sent_at');
            $table->text('notes')->nullable()->after('sent_to');
        });

        // Old drafts: total_amount was the net sum.
        DB::table('invoices')->update([
            'vat_amount' => DB::raw('round(total_amount * 0.19, 2)'),
            'gross_amount' => DB::raw('round(total_amount * 1.19, 2)'),
        ]);
    }

    public function down(): void
    {
        Schema::table('invoices', fn (Blueprint $table) => $table->dropColumn(['vat_rate', 'vat_amount', 'gross_amount', 'due_at', 'period_from', 'period_to', 'sent_at', 'sent_to', 'notes']));
        Schema::dropIfExists('app_settings');
    }
};
