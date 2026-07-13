<?php

namespace App\Http\Middleware;

use App\Support\CurrentUser;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        if ($this->allowsLocalDevBypass($request)) {
            $request->attributes->set('current_user', (object) [
                'id' => 0,
                'name' => 'Local Dev User',
                'email' => 'local-dev@example.test',
                'role' => 'admin',
                'is_active' => true,
            ]);

            return $next($request);
        }

        $user = CurrentUser::fromRequest($request);

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        if (!CurrentUser::hasRole($user, $roles)) {
            return response()->json([
                'message' => 'Forbidden.',
                'required_roles' => $roles,
                'current_role' => $user->role,
            ], 403);
        }

        $request->attributes->set('current_user', $user);

        return $next($request);
    }

    private function allowsLocalDevBypass(Request $request): bool
    {
        return app()->environment(['local', 'testing'])
            && $request->header('X-Local-Dev-Bypass') === 'rail-crm-dev';
    }
}
