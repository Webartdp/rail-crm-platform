<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CurrentUser
{
    public static function fromRequest(Request $request): ?object
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

    public static function hasRole(?object $user, array $roles): bool
    {
        return $user !== null && in_array($user->role, $roles, true);
    }
}
