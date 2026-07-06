<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employee_profiles', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable()->index();
            $table->string('first_name')->nullable();
            $table->string('last_name')->nullable();
            $table->string('phone')->nullable();
            $table->decimal('standard_hourly_rate', 10, 2)->default(0);
            $table->decimal('night_coefficient', 6, 3)->default(1);
            $table->decimal('sunday_coefficient', 6, 3)->default(1);
            $table->decimal('holiday_coefficient', 6, 3)->default(1);
            $table->string('home_location')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employee_profiles');
    }
};
