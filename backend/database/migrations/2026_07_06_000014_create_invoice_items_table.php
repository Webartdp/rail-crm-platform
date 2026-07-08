<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoice_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('invoice_id')->index();
            $table->unsignedBigInteger('approval_id')->nullable()->index();
            $table->unsignedBigInteger('employee_id')->index();
            $table->unsignedBigInteger('assignment_id')->index();
            $table->string('type', 50)->index();
            $table->decimal('hours', 8, 2)->default(0);
            $table->decimal('hourly_rate', 10, 2)->default(0);
            $table->decimal('coefficient', 6, 3)->default(1);
            $table->decimal('amount', 12, 2)->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice_items');
    }
};
