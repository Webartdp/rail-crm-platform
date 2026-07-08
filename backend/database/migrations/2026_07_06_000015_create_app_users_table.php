<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('app_users', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('employee_profile_id')->nullable()->index();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('password_hash');
            $table->string('role', 50)->default('employee')->index();
            $table->string('api_token', 100)->nullable()->unique();
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('app_users');
    }
};
