<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AppUser;
use App\Support\AuthLinks;
use App\Support\CurrentUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/** Admin: user accounts, invitations and password-reset links. */
class UserController extends Controller
{
    private const COLUMNS = ['id', 'employee_profile_id', 'name', 'email', 'role', 'locale', 'is_active', 'last_login_at', 'password_set_at', 'created_at', 'updated_at'];

    public function index(): JsonResponse
    {
        $users = DB::table('app_users')->select(self::COLUMNS)->orderBy('name')->get();
        $pending = DB::table('auth_links')
            ->where('type', AuthLinks::INVITE)
            ->whereNull('used_at')
            ->where('expires_at', '>', now())
            ->pluck('expires_at', 'user_id');

        return response()->json([
            'data' => $users->map(function ($user) use ($pending) {
                $user->invite_pending_until = $pending[$user->id] ?? null;

                return $user;
            }),
        ]);
    }

    /**
     * Create a user. Without a password an invitation link is created (and e-mailed when mail works);
     * the admin can also copy the link and send it any other way.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'role' => ['required', 'in:'.implode(',', AuthController::ROLES)],
            'locale' => ['nullable', 'in:de,ru'],
            'employee_profile_id' => ['nullable', 'integer', 'exists:employee_profiles,id'],
            'password' => ['nullable', ...array_slice(AuthController::PASSWORD_RULES, 1)],
        ], ['password.regex' => __('The password must contain at least one letter and one digit.')]);

        $email = strtolower(trim($data['email']));
        if (DB::table('app_users')->whereRaw('lower(email) = ?', [$email])->exists()) {
            return response()->json([
                'message' => __('User already exists.'),
                'errors' => ['email' => [__('User already exists.')]],
            ], 422);
        }

        $withPassword = !empty($data['password']);
        $user = AppUser::query()->create([
            'employee_profile_id' => $data['employee_profile_id'] ?? null,
            'name' => $data['name'],
            'email' => $email,
            // Invited users get an unusable random password until they set their own.
            'password_hash' => Hash::make($withPassword ? $data['password'] : Str::random(64)),
            'role' => $data['role'],
            'api_token' => null,
            'is_active' => true,
        ]);
        DB::table('app_users')->where('id', $user->id)->update([
            'locale' => $data['locale'] ?? app()->getLocale(),
            'password_set_at' => $withPassword ? now() : null,
        ]);

        $response = ['message' => __('User created.'), 'data' => $this->find($user->id)];

        if (!$withPassword) {
            $response += $this->issueLink($request, $user->id, AuthLinks::INVITE);
            $response['message'] = __('User created. Send the invitation link to the user.');
        }

        return response()->json($response, 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $user = DB::table('app_users')->where('id', $id)->first();
        if (!$user) {
            return response()->json(['message' => __('User not found.')], 404);
        }

        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => ['sometimes', 'required', 'email', 'max:255'],
            'role' => ['sometimes', 'required', 'in:'.implode(',', AuthController::ROLES)],
            'locale' => ['sometimes', 'nullable', 'in:de,ru'],
            'employee_profile_id' => ['sometimes', 'nullable', 'integer', 'exists:employee_profiles,id'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $me = CurrentUser::fromRequest($request);
        if ($me && (int) $me->id === $id) {
            if (array_key_exists('is_active', $data) && !$data['is_active']) {
                return response()->json(['message' => __('You cannot deactivate your own account.')], 422);
            }
            if (array_key_exists('role', $data) && $data['role'] !== 'admin') {
                return response()->json(['message' => __('You cannot remove your own admin role.')], 422);
            }
        }

        if (isset($data['email'])) {
            $data['email'] = strtolower(trim($data['email']));
            $taken = DB::table('app_users')->whereRaw('lower(email) = ?', [$data['email']])->where('id', '!=', $id)->exists();
            if ($taken) {
                return response()->json([
                    'message' => __('User already exists.'),
                    'errors' => ['email' => [__('User already exists.')]],
                ], 422);
            }
        }

        DB::table('app_users')->where('id', $id)->update([...$data, 'updated_at' => now()]);

        $roleChanged = isset($data['role']) && $data['role'] !== $user->role;
        $deactivated = array_key_exists('is_active', $data) && !$data['is_active'];
        if ($roleChanged || $deactivated) {
            // Tokens carry the role, so old sessions must end.
            AppUser::query()->find($id)?->tokens()->delete();
        }

        return response()->json(['message' => __('User updated.'), 'data' => $this->find($id)]);
    }

    /** New invitation link (for users who never set a password or lost the first link). */
    public function invite(Request $request, int $id): JsonResponse
    {
        if (!DB::table('app_users')->where('id', $id)->exists()) {
            return response()->json(['message' => __('User not found.')], 404);
        }

        return response()->json(['message' => __('Invitation link created.')] + $this->issueLink($request, $id, AuthLinks::INVITE));
    }

    /** Password-reset link created by the admin (when the user cannot receive e-mail). */
    public function resetLink(Request $request, int $id): JsonResponse
    {
        if (!DB::table('app_users')->where('id', $id)->exists()) {
            return response()->json(['message' => __('User not found.')], 404);
        }

        return response()->json(['message' => __('Password reset link created.')] + $this->issueLink($request, $id, AuthLinks::RESET));
    }

    private function issueLink(Request $request, int $userId, string $type): array
    {
        $me = CurrentUser::fromRequest($request);
        $link = AuthLinks::create($userId, $type, $me?->id ? (int) $me->id : null);
        $user = DB::table('app_users')->where('id', $userId)->first();
        $sent = AuthLinks::send($user, $type, $link['url']);

        return [
            'link' => [
                'type' => $type,
                'url' => $link['url'],
                'expires_at' => $link['expires_at'],
                'email_sent' => $sent,
            ],
        ];
    }

    private function find(int $id): ?object
    {
        return DB::table('app_users')->select(self::COLUMNS)->where('id', $id)->first();
    }
}
