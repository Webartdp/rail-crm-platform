<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('work_event_approvals', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('employee_id')->index();
            $table->unsignedBigInteger('assignment_id')->index();
            $table->string('pair_type', 50)->index();
            $table->timestamp('start_time')->index();
            $table->timestamp('stop_time')->index();
            $table->string('status', 30)->default('pending')->index();
            $table->unsignedBigInteger('approved_by')->nullable()->index();
            $table->timestamp('approved_at')->nullable();
            $table->text('comment')->nullable();
            $table->timestamps();

            $table->unique(['employee_id', 'assignment_id', 'pair_type', 'start_time', 'stop_time'], 'work_event_approval_unique_pair');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('work_event_approvals');
    }
};
