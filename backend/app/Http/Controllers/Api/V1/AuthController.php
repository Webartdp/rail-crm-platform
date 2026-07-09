<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AppUser;
use App\Support\CurrentUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\PersonalAccessToken;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $email = trim((string) $request->input('email'));
        $password = (string) $request->input('password');

        if ($email === '' || $password === '') {
            return response()->json(['message' => 'Email and password are required.'], 422);
        }

        $exists = AppUser::query()->where('email', $email)->exists();
        if ($exists) {
            return response()->json(['message' => 'User already exists.'], 409);
        }

        $user = AppUser::query()->create([
            'employee_profile_id' => $request->input('employee_profile_id'),
            'name' => $request->input('name', $email),
            'email' => $email,
            'password_hash' => Hash::make($password),
            'role' => $request->input('role', 'employee'),
            'api_token' => null,
            'is_active' => true,
        ]);

        $token = $user->createToken('crm-api', [$user->role])->plainTextToken;

        return response()->json([
            'message' => 'User registered.',
            'token' => $token,
            'token_type' => 'sanctum',
            'data' => $this->publicUser($user->id),
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $email = trim((string) $request->input('email'));
        $password = (string) $request->input('password');
        $user = AppUser::query()->where('email', $email)->first();

        if (!$user || !$user->is_active || !Hash::check($password, $user->password_hash)) {
            return response()->json(['message' => 'Invalid credentials.'], 401);
        }

        $user->tokens()->delete();
        $token = $user->createToken('crm-api', [$user->role])->plainTextToken;

        return response()->json([
            'message' => 'Logged in.',
            'token' => $token,
            'token_type' => 'sanctum',
            'data' => $this->publicUser($user->id),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = CurrentUser::fromRequest($request);

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
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

        return response()->json(['message' => 'Logged out.']);
    }

    private function publicUser(int $id): ?object
    {
        return DB::table('app_users')
            ->select('id', 'employee_profile_id', 'name', 'email', 'role', 'is_active', 'created_at', 'updated_at')
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
