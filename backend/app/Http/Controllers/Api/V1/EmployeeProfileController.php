<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
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

    public function show(int $id): JsonResponse
    {
        $profile = DB::table('employee_profiles')->where('id', $id)->first();

        if (!$profile) {
            return response()->json(['message' => 'Employee profile not found.'], 404);
        }

        return response()->json(['data' => $profile]);
    }

    public function store(Request $request): JsonResponse
    {
        $now = now();

        $id = DB::table('employee_profiles')->insertGetId($this->payload($request, $now));

        return response()->json([
            'message' => 'Employee profile created.',
            'data' => DB::table('employee_profiles')->where('id', $id)->first(),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $profile = DB::table('employee_profiles')->where('id', $id)->first();

        if (!$profile) {
            return response()->json(['message' => 'Employee profile not found.'], 404);
        }

        DB::table('employee_profiles')->where('id', $id)->update($this->payload($request, now(), false));

        return response()->json([
            'message' => 'Employee profile updated.',
            'data' => DB::table('employee_profiles')->where('id', $id)->first(),
        ]);
    }

    private function payload(Request $request, $now, bool $create = true): array
    {
        $payload = [
            'first_name' => $request->input('first_name'),
            'last_name' => $request->input('last_name'),
            'phone' => $request->input('phone'),
            'standard_hourly_rate' => $request->input('standard_hourly_rate', 0),
            'travel_hourly_rate' => $request->input('travel_hourly_rate', 0),
            'night_coefficient' => $request->input('night_coefficient', 1),
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
