<?php

namespace App\Support;

use App\Models\AppUser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\PersonalAccessToken;

class CurrentUser
{
    public static function fromRequest(Request $request): ?object
    {
        $sanctumUser = $request->user();
        if ($sanctumUser && $sanctumUser->is_active) {
            return $sanctumUser;
        }

        $token = self::tokenFromRequest($request);
        if ($token === '') {
            return null;
        }

        $accessToken = PersonalAccessToken::findToken($token);
        if ($accessToken && $accessToken->tokenable instanceof AppUser && $accessToken->tokenable->is_active) {
            $accessToken->forceFill(['last_used_at' => now()])->save();
            return $accessToken->tokenable;
        }

        return DB::table('app_users')
            ->where('api_token', $token)
            ->where('is_active', true)
            ->first();
    }

    /**
     * Employee profile the request acts for. Employees can only act for their own profile;
     * managers and admins may pass employee_id explicitly.
     */
    public static function actingEmployeeId(Request $request): ?int
    {
        $user = $request->attributes->get('current_user') ?? self::fromRequest($request);

        if ($user && ($user->role ?? null) === 'employee') {
            return $user->employee_profile_id ? (int) $user->employee_profile_id : null;
        }

        $requested = $request->input('employee_id');
        if ($requested !== null && $requested !== '') {
            return (int) $requested;
        }

        return $user && $user->employee_profile_id ? (int) $user->employee_profile_id : null;
    }

    public static function isEmployee(Request $request): bool
    {
        $user = $request->attributes->get('current_user') ?? self::fromRequest($request);

        return ($user->role ?? null) === 'employee';
    }

    public static function hasRole(?object $user, array $roles): bool
    {
        return $user !== null && in_array($user->role, $roles, true);
    }

    private static function tokenFromRequest(Request $request): string
    {
        $header = (string) $request->header('Authorization', '');

        return str_starts_with($header, 'Bearer ')
            ? substr($header, 7)
            : (string) $request->header('X-CRM-Token', '');
    }
}
