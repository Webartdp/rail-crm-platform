<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $email = trim((string) $request->input('email'));
        $password = (string) $request->input('password');

        if ($email === '' || $password === '') {
            return response()->json(['message' => 'Email and password are required.'], 422);
        }

        $exists = DB::table('app_users')->where('email', $email)->exists();
        if ($exists) {
            return response()->json(['message' => 'User already exists.'], 409);
        }

        $now = now();
        $token = hash('sha256', Str::random(80));
        $id = DB::table('app_users')->insertGetId([
            'employee_profile_id' => $request->input('employee_profile_id'),
            'name' => $request->input('name', $email),
            'email' => $email,
            'password_hash' => Hash::make($password),
            'role' => $request->input('role', 'employee'),
            'api_token' => $token,
            'is_active' => true,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        return response()->json([
            'message' => 'User registered.',
            'token' => $token,
            'data' => $this->publicUser($id),
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $email = trim((string) $request->input('email'));
        $password = (string) $request->input('password');
        $user = DB::table('app_users')->where('email', $email)->first();

        if (!$user || !$user->is_active || !Hash::check($password, $user->password_hash)) {
            return response()->json(['message' => 'Invalid credentials.'], 401);
        }

        $token = hash('sha256', Str::random(80));
        DB::table('app_users')->where('id', $user->id)->update([
            'api_token' => $token,
            'updated_at' => now(),
        ]);

        return response()->json([
            'message' => 'Logged in.',
            'token' => $token,
            'data' => $this->publicUser($user->id),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $this->userFromToken($request);

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        return response()->json(['data' => $this->publicUser($user->id)]);
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $this->userFromToken($request);

        if ($user) {
            DB::table('app_users')->where('id', $user->id)->update([
                'api_token' => null,
                'updated_at' => now(),
            ]);
        }

        return response()->json(['message' => 'Logged out.']);
    }

    private function userFromToken(Request $request): ?object
    {
        $header = (string) $request->header('Authorization', '');
        $token = str_starts_with($header, 'Bearer ') ? substr($header, 7) : (string) $request->header('X-CRM-Token', '');

        if ($token === '') {
            return null;
        }

        return DB::table('app_users')
            ->where('api_token', $token)
            ->where('is_active', true)
            ->first();
    }

    private function publicUser(int $id): ?object
    {
        return DB::table('app_users')
            ->select('id', 'employee_profile_id', 'name', 'email', 'role', 'is_active', 'created_at', 'updated_at')
            ->where('id', $id)
            ->first();
    }
}
