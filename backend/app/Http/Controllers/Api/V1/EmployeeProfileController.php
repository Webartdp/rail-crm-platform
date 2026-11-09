<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Support\CurrentUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EmployeeProfileController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => DB::table('employee_profiles')->orderByDesc('id')->limit(100)->get(),
        ]);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $user = CurrentUser::fromRequest($request);

        if (!$user) {
            return response()->json(['message' => __('Unauthenticated.')], 401);
        }

        $role = is_array($user) ? ($user['role'] ?? null) : ($user->role ?? null);
        $employeeProfileId = is_array($user) ? ($user['employee_profile_id'] ?? null) : ($user->employee_profile_id ?? null);

        if ($role === 'employee' && (int) $employeeProfileId !== (int) $id) {
            return response()->json([
                'message' => __('Forbidden.'),
                'reason' => 'Employees may only view their own profile.',
            ], 403);
        }

        $profile = DB::table('employee_profiles')->where('id', $id)->first();

        if (!$profile) {
            return response()->json(['message' => __('Employee profile not found.')], 404);
        }

        if ($role === 'employee') {
            // Tariffs are internal: employees see their personal data only.
            foreach (['standard_hourly_rate', 'travel_hourly_rate', 'night_coefficient', 'night_20_24_coefficient', 'night_00_04_coefficient', 'night_04_06_coefficient', 'sunday_coefficient', 'holiday_coefficient'] as $field) {
                unset($profile->{$field});
            }
        }

        return response()->json(['data' => $profile]);
    }

    public function store(Request $request): JsonResponse
    {
        $forbidden = $this->adminOnly($request);
        if ($forbidden) {
            return $forbidden;
        }

        $now = now();
        $id = DB::table('employee_profiles')->insertGetId($this->payload($request, $now));

        return response()->json([
            'message' => __('Employee profile created.'),
            'data' => DB::table('employee_profiles')->where('id', $id)->first(),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $forbidden = $this->adminOnly($request);
        if ($forbidden) {
            return $forbidden;
        }

        $profile = DB::table('employee_profiles')->where('id', $id)->first();

        if (!$profile) {
            return response()->json(['message' => __('Employee profile not found.')], 404);
        }

        DB::table('employee_profiles')->where('id', $id)->update($this->payload($request, now(), false));

        return response()->json([
            'message' => __('Employee profile updated.'),
            'data' => DB::table('employee_profiles')->where('id', $id)->first(),
        ]);
    }

    private function adminOnly(Request $request): ?JsonResponse
    {
        $user = CurrentUser::fromRequest($request);

        if (!CurrentUser::hasRole($user, ['admin'])) {
            return response()->json(['message' => __('Only admin can change employee tariff settings.')], 403);
        }

        return null;
    }

    private function payload(Request $request, $now, bool $create = true): array
    {
        $payload = [
            'first_name' => $request->input('first_name'),
            'last_name' => $request->input('last_name'),
            'phone' => $request->input('phone'),
            'standard_hourly_rate' => $request->input('standard_hourly_rate', 0),
            'travel_hourly_rate' => $request->input('travel_hourly_rate', 0),
            'night_coefficient' => $request->input('night_20_24_coefficient', $request->input('night_coefficient', 1)),
            'night_20_24_coefficient' => $request->input('night_20_24_coefficient', 1.25),
            'night_00_04_coefficient' => $request->input('night_00_04_coefficient', 1.40),
            'night_04_06_coefficient' => $request->input('night_04_06_coefficient', 1.25),
            'sunday_coefficient' => $request->input('sunday_coefficient', 1),
            'holiday_coefficient' => $request->input('holiday_coefficient', 1),
            'home_location' => $request->input('home_location'),
            'is_active' => $request->input('is_active', true),
            'updated_at' => $now,
        ];

        if ($create) {
            $payload['created_at'] = $now;
        }

        return $payload;
    }
}
