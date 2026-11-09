<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('app_users', function (Blueprint $table) {
            $table->string('locale', 5)->nullable()->after('role');
            $table->timestamp('last_login_at')->nullable()->after('is_active');
            $table->timestamp('password_set_at')->nullable()->after('last_login_at');
        });

        // Existing accounts already have a password.
        DB::table('app_users')->update(['password_set_at' => DB::raw('created_at')]);

        // One-time links: invitation (set first password) and password reset.
        Schema::create('auth_links', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->index();
            $table->string('type', 20)->index();
            $table->string('token_hash', 64)->unique();
            $table->timestamp('expires_at');
            $table->timestamp('used_at')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
        });

        Schema::create('login_attempts', function (Blueprint $table) {
            $table->id();
            $table->string('email')->index();
            $table->string('ip', 45)->index();
            $table->boolean('successful')->default(false);
            $table->timestamp('attempted_at')->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('login_attempts');
        Schema::dropIfExists('auth_links');
        Schema::table('app_users', function (Blueprint $table) {
            $table->dropColumn(['locale', 'last_login_at', 'password_set_at']);
        });
    }
};
