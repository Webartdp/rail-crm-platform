<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AppUser;
use App\Support\AuthLinks;
use App\Support\CurrentUser;
use App\Support\LoginThrottle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\PersonalAccessToken;

class AuthController extends Controller
{
    public const ROLES = ['employee', 'manager', 'admin'];
    public const PASSWORD_RULES = ['required', 'string', 'min:8', 'max:200', 'regex:/[A-Za-zА-Яа-яÄÖÜäöüß]/u', 'regex:/[0-9]/'];

    /** Admin only (route middleware): create a user with a password. Does not log the admin out. */
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'password' => self::PASSWORD_RULES,
            'role' => ['nullable', 'in:'.implode(',', self::ROLES)],
            'employee_profile_id' => ['nullable', 'integer'],
        ], $this->passwordMessages());

        $email = strtolower(trim($data['email']));

        if (AppUser::query()->where('email', $email)->exists()) {
            return response()->json(['message' => __('User already exists.')], 409);
        }

        $user = AppUser::query()->create([
            'employee_profile_id' => $data['employee_profile_id'] ?? null,
            'name' => $data['name'] ?? $email,
            'email' => $email,
            'password_hash' => Hash::make($data['password']),
            'role' => $data['role'] ?? 'employee',
            'api_token' => null,
            'is_active' => true,
        ]);
        DB::table('app_users')->where('id', $user->id)->update(['password_set_at' => now()]);

        return response()->json([
            'message' => __('User registered.'),
            'data' => $this->publicUser($user->id),
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $email = strtolower(trim((string) $request->input('email')));
        $password = (string) $request->input('password');
        $ip = (string) $request->ip();

        if ($email === '' || $password === '') {
            return response()->json(['message' => __('Email and password are required.')], 422);
        }

        $lockedFor = LoginThrottle::lockedFor($email, $ip);
        if ($lockedFor > 0) {
            return response()->json([
                'message' => __('Too many login attempts. Try again in :minutes min.', ['minutes' => (int) ceil($lockedFor / 60)]),
                'retry_after' => $lockedFor,
            ], 429)->header('Retry-After', (string) $lockedFor);
        }

        $user = AppUser::query()->whereRaw('lower(email) = ?', [$email])->first();

        if (!$user || !$user->is_active || !Hash::check($password, $user->password_hash)) {
            LoginThrottle::record($email, $ip, false);

            return response()->json(['message' => __('Invalid credentials.')], 401);
        }

        LoginThrottle::record($email, $ip, true);

        $user->tokens()->delete();
        $token = $user->createToken('crm-api', [$user->role])->plainTextToken;
        DB::table('app_users')->where('id', $user->id)->update(['last_login_at' => now()]);

        return response()->json([
            'message' => __('Logged in.'),
            'token' => $token,
            'token_type' => 'sanctum',
            'data' => $this->publicUser($user->id),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = CurrentUser::fromRequest($request);

        if (!$user) {
            return response()->json(['message' => __('Unauthenticated.')], 401);
        }

        return response()->json(['data' => $this->publicUser($user->id)]);
    }

    public function logout(Request $request): JsonResponse
    {
        $user = CurrentUser::fromRequest($request);
        $plainToken = $this->tokenFromRequest($request);
        $sanctumToken = $plainToken !== '' ? PersonalAccessToken::findToken($plainToken) : null;

        if ($sanctumToken) {
            $sanctumToken->delete();
        } elseif ($user) {
            DB::table('app_users')->where('id', $user->id)->update([
                'api_token' => null,
                'updated_at' => now(),
            ]);
        }

        return response()->json(['message' => __('Logged out.')]);
    }

    /** Public. Always answers the same way so it cannot be used to find out which e-mails exist. */
    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => ['required', 'email', 'max:255']]);
        $email = strtolower(trim((string) $request->input('email')));
        $ip = (string) $request->ip();

        // Reuse the login throttle so this endpoint cannot be used to spam mailboxes.
        if (LoginThrottle::lockedFor($email, $ip) === 0) {
            LoginThrottle::record($email, $ip, false);

            $user = AppUser::query()->whereRaw('lower(email) = ?', [$email])->where('is_active', true)->first();
            if ($user) {
                $link = AuthLinks::create($user->id, AuthLinks::RESET);
                AuthLinks::send($user, AuthLinks::RESET, $link['url']);
            }
        }

        return response()->json([
            'message' => __('If this e-mail is registered, a reset link has been sent. If no e-mail arrives, ask your administrator for a link.'),
        ]);
    }

    /** Public. What the set-password page needs to show. */
    public function linkInfo(Request $request): JsonResponse
    {
        $link = AuthLinks::find((string) $request->query('token', ''));

        if (!$link) {
            return response()->json(['message' => __('This link is invalid or has expired. Ask your administrator for a new one.')], 404);
        }

        $user = DB::table('app_users')->where('id', $link->user_id)->first();
        if (!$user) {
            return response()->json(['message' => __('This link is invalid or has expired. Ask your administrator for a new one.')], 404);
        }

        return response()->json([
            'data' => [
                'type' => $link->type,
                'email' => $user->email,
                'name' => $user->name,
                'expires_at' => $link->expires_at,
            ],
        ]);
    }

    /** Public. Sets the password from an invitation or reset link and logs the user in. */
    public function setPassword(Request $request): JsonResponse
    {
        $request->validate([
            'token' => ['required', 'string'],
            'password' => [...self::PASSWORD_RULES, 'confirmed'],
        ], $this->passwordMessages());

        $link = AuthLinks::find((string) $request->input('token'));
        if (!$link) {
            return response()->json(['message' => __('This link is invalid or has expired. Ask your administrator for a new one.')], 422);
        }

        $user = AppUser::query()->find($link->user_id);
        if (!$user) {
            return response()->json(['message' => __('This link is invalid or has expired. Ask your administrator for a new one.')], 422);
        }

        DB::transaction(function () use ($user, $link, $request) {
            DB::table('app_users')->where('id', $user->id)->update([
                'password_hash' => Hash::make((string) $request->input('password')),
                'password_set_at' => now(),
                'is_active' => $link->type === AuthLinks::INVITE ? true : $user->is_active,
                'updated_at' => now(),
            ]);
            AuthLinks::markUsed($link->id);
            // A new password ends all old sessions.
            $user->tokens()->delete();
        });

        $user->refresh();
        if (!$user->is_active) {
            return response()->json(['message' => __('Password saved. Your account is deactivated, contact your administrator.')], 403);
        }

        $token = $user->createToken('crm-api', [$user->role])->plainTextToken;
        DB::table('app_users')->where('id', $user->id)->update(['last_login_at' => now()]);

        return response()->json([
            'message' => __('Password saved.'),
            'token' => $token,
            'token_type' => 'sanctum',
            'data' => $this->publicUser($user->id),
        ]);
    }

    /** Logged-in user changes their own password. */
    public function changePassword(Request $request): JsonResponse
    {
        $current = CurrentUser::fromRequest($request);
        $user = $current ? AppUser::query()->find($current->id) : null;

        if (!$user) {
            return response()->json(['message' => __('Unauthenticated.')], 401);
        }

        $request->validate([
            'current_password' => ['required', 'string'],
            'password' => [...self::PASSWORD_RULES, 'confirmed'],
        ], $this->passwordMessages());

        if (!Hash::check((string) $request->input('current_password'), $user->password_hash)) {
            return response()->json([
                'message' => __('The current password is wrong.'),
                'errors' => ['current_password' => [__('The current password is wrong.')]],
            ], 422);
        }

        $plainToken = $this->tokenFromRequest($request);
        $keep = $plainToken !== '' ? PersonalAccessToken::findToken($plainToken) : null;

        DB::table('app_users')->where('id', $user->id)->update([
            'password_hash' => Hash::make((string) $request->input('password')),
            'password_set_at' => now(),
            'updated_at' => now(),
        ]);
        // Sign out every other device, keep this session.
        $user->tokens()->when($keep, fn ($query) => $query->where('id', '!=', $keep->id))->delete();

        return response()->json(['message' => __('Password changed.')]);
    }

    /** Logged-in user stores the UI language (used for e-mails). */
    public function updateLocale(Request $request): JsonResponse
    {
        $user = CurrentUser::fromRequest($request);
        if (!$user) {
            return response()->json(['message' => __('Unauthenticated.')], 401);
        }

        $data = $request->validate(['locale' => ['required', 'in:de,ru']]);
        DB::table('app_users')->where('id', $user->id)->update(['locale' => $data['locale'], 'updated_at' => now()]);

        return response()->json(['data' => $this->publicUser($user->id)]);
    }

    private function passwordMessages(): array
    {
        return [
            'password.regex' => __('The password must contain at least one letter and one digit.'),
        ];
    }

    private function publicUser(int $id): ?object
    {
        return DB::table('app_users')
            ->select('id', 'employee_profile_id', 'name', 'email', 'role', 'locale', 'is_active', 'last_login_at', 'created_at', 'updated_at')
            ->where('id', $id)
            ->first();
    }

    private function tokenFromRequest(Request $request): string
    {
        $header = (string) $request->header('Authorization', '');

        return str_starts_with($header, 'Bearer ')
            ? substr($header, 7)
            : (string) $request->header('X-CRM-Token', '');
    }
}
