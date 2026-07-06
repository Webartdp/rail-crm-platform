<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('work_sessions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('employee_id')->nullable()->index();
            $table->unsignedBigInteger('assignment_id')->nullable()->index();
            $table->string('status', 50)->default('draft')->index();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('stopped_at')->nullable();
            $table->string('leistungsart')->nullable();
            $table->string('reference_number')->nullable();
            $table->string('zugnummer')->nullable();
            $table->string('einsatzort')->nullable();
            $table->text('bemerkung')->nullable();
            $table->boolean('planned_exceeded')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('work_sessions');
    }
};
