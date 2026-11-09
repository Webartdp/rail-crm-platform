<?php

namespace Tests\Feature;

use App\Models\AppUser;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class UserAccessSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_invites_user_and_user_sets_password_from_link(): void
    {
        $admin = $this->tokenForRole('admin');

        $response = $this->withHeader('Authorization', 'Bearer '.$admin)
            ->postJson('/api/v1/users', [
                'name' => 'Max Müller',
                'email' => 'max@example.com',
                'role' => 'employee',
                'locale' => 'de',
            ])
            ->assertCreated()
            ->assertJsonPath('link.type', 'invite');

        $url = $response->json('link.url');
        parse_str((string) parse_url($url, PHP_URL_QUERY), $query);
        $token = $query['token'];

        $this->flushHeaders();

        $this->getJson('/api/v1/auth/link?token='.$token)
            ->assertOk()
            ->assertJsonPath('data.email', 'max@example.com')
            ->assertJsonPath('data.type', 'invite');

        $this->postJson('/api/v1/auth/set-password', [
            'token' => $token,
            'password' => 'NeuesPasswort1',
            'password_confirmation' => 'NeuesPasswort1',
        ])->assertOk()->assertJsonStructure(['token', 'data' => ['email']]);

        // A link works only once.
        $this->postJson('/api/v1/auth/set-password', [
            'token' => $token,
            'password' => 'NochEins12345',
            'password_confirmation' => 'NochEins12345',
        ])->assertStatus(422);

        $this->postJson('/api/v1/auth/login', ['email' => 'max@example.com', 'password' => 'NeuesPasswort1'])->assertOk();
    }

    public function test_weak_password_is_rejected(): void
    {
        $admin = $this->tokenForRole('admin');

        $this->withHeader('Authorization', 'Bearer '.$admin)
            ->postJson('/api/v1/users', [
                'name' => 'Weak',
                'email' => 'weak@example.com',
                'role' => 'employee',
                'password' => 'abcdefgh',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('password');
    }

    public function test_login_is_locked_after_five_failed_attempts(): void
    {
        $this->createUser('employee', 'locked@example.com', 'Correct123');

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/auth/login', ['email' => 'locked@example.com', 'password' => 'wrong'])->assertUnauthorized();
        }

        $this->postJson('/api/v1/auth/login', ['email' => 'locked@example.com', 'password' => 'Correct123'])
            ->assertStatus(429)
            ->assertJsonStructure(['retry_after']);
    }

    public function test_forgot_password_does_not_reveal_unknown_emails(): void
    {
        $this->createUser('employee', 'known@example.com', 'Correct123');

        $known = $this->postJson('/api/v1/auth/forgot-password', ['email' => 'known@example.com'])->assertOk()->json('message');
        $unknown = $this->postJson('/api/v1/auth/forgot-password', ['email' => 'nobody@example.com'])->assertOk()->json('message');

        $this->assertSame($known, $unknown);
        $this->assertDatabaseCount('auth_links', 1);
    }

    public function test_deactivated_user_loses_access(): void
    {
        $admin = $this->tokenForRole('admin');
        $employeeId = $this->createUser('employee', 'leaver@example.com', 'Correct123');
        $employeeToken = AppUser::query()->findOrFail($employeeId)->createToken('t', ['employee'])->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$admin)
            ->putJson('/api/v1/users/'.$employeeId, ['is_active' => false])
            ->assertOk();

        $this->flushHeaders();
        $this->withHeader('Authorization', 'Bearer '.$employeeToken)->getJson('/api/v1/auth/me')->assertUnauthorized();
        $this->postJson('/api/v1/auth/login', ['email' => 'leaver@example.com', 'password' => 'Correct123'])->assertUnauthorized();
    }

    public function test_api_answers_in_requested_language(): void
    {
        $this->withHeader('Accept-Language', 'ru')
            ->postJson('/api/v1/auth/login', ['email' => 'nobody@example.com', 'password' => 'wrong'])
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Неверный e-mail или пароль.');

        $this->withHeader('Accept-Language', 'de')
            ->postJson('/api/v1/auth/login', ['email' => 'nobody2@example.com', 'password' => 'wrong'])
            ->assertUnauthorized()
            ->assertJsonPath('message', 'E-Mail oder Passwort ist falsch.');
    }

    public function test_dev_tools_need_admin_login(): void
    {
        $this->postJson('/api/v1/dev/reset-work-events', ['employee_id' => 1])
            ->assertStatus(401);
    }

    private function createUser(string $role, string $email, string $password): int
    {
        return DB::table('app_users')->insertGetId([
            'name' => ucfirst($role),
            'email' => $email,
            'password_hash' => Hash::make($password),
            'role' => $role,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function tokenForRole(string $role): string
    {
        $id = $this->createUser($role, $role.'@example.com', 'Password123');

        return AppUser::query()->findOrFail($id)->createToken('test-token', [$role])->plainTextToken;
    }
}
