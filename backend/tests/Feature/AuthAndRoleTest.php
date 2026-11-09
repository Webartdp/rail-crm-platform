<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AuthAndRoleTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_registration_is_closed(): void
    {
        $this->postJson('/api/v1/auth/register', [
            'name' => 'Intruder',
            'email' => 'intruder@example.com',
            'password' => 'Password123',
            'role' => 'admin',
        ])->assertUnauthorized();

        $this->assertDatabaseMissing('app_users', ['email' => 'intruder@example.com']);
    }

    public function test_admin_can_register_user_and_user_can_log_in(): void
    {
        $adminToken = $this->tokenForRole('admin');

        $this->withHeader('Authorization', 'Bearer '.$adminToken)
            ->postJson('/api/v1/auth/register', [
                'name' => 'New Manager',
                'email' => 'new.manager@example.com',
                'password' => 'Password123',
                'role' => 'manager',
            ])
            ->assertCreated()
            ->assertJsonPath('data.role', 'manager');

        $this->flushHeaders();
        $token = $this->postJson('/api/v1/auth/login', [
            'email' => 'new.manager@example.com',
            'password' => 'Password123',
        ])->assertOk()->json('token');

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('data.email', 'new.manager@example.com');
    }

    public function test_manager_cannot_register_users(): void
    {
        $token = $this->tokenForRole('manager');

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/auth/register', [
                'email' => 'x@example.com',
                'password' => 'Password123',
                'role' => 'admin',
            ])
            ->assertForbidden();
    }

    public function test_logout_deletes_sanctum_token(): void
    {
        $token = $this->tokenForRole('employee');

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/auth/logout')
            ->assertOk();

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/auth/me')
            ->assertUnauthorized();
    }

    public function test_employee_cannot_access_manager_dashboard(): void
    {
        $token = $this->tokenForRole('employee');

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/dashboard/manager')
            ->assertForbidden()
            ->assertJsonPath('current_role', 'employee');
    }

    public function test_manager_can_access_manager_dashboard(): void
    {
        $token = $this->tokenForRole('manager');

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/dashboard/manager')
            ->assertOk()
            ->assertJsonStructure(['data' => ['counts', 'generated_for']]);
    }

    public function test_manager_cannot_create_employee_profile(): void
    {
        $token = $this->tokenForRole('manager');

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/employee-profiles', [
                'first_name' => 'Max',
                'last_name' => 'Muller',
                'standard_hourly_rate' => 28,
            ])
            ->assertForbidden();
    }

    public function test_admin_can_create_employee_profile(): void
    {
        $token = $this->tokenForRole('admin');

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/employee-profiles', [
                'first_name' => 'Max',
                'last_name' => 'Muller',
                'standard_hourly_rate' => 28,
                'travel_hourly_rate' => 0,
                'night_coefficient' => 1.25,
                'sunday_coefficient' => 1.5,
                'holiday_coefficient' => 2,
                'home_location' => 'Dresden',
            ])
            ->assertCreated()
            ->assertJsonPath('data.first_name', 'Max');
    }

    private function tokenForRole(string $role): string
    {
        $id = DB::table('app_users')->insertGetId([
            'name' => ucfirst($role).' User',
            'email' => $role.'@example.com',
            'password_hash' => Hash::make('password'),
            'role' => $role,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $user = \App\Models\AppUser::query()->findOrFail($id);

        return $user->createToken('test-token', [$role])->plainTextToken;
    }
}
