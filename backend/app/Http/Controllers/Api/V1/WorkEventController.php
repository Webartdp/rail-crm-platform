<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WorkEventController extends Controller
{
    public function startGasfahrt(Request $request): JsonResponse
    {
        return $this->storeEvent($request, 'gasfahrt_start', 'Gasfahrt started');
    }

    public function stopGasfahrt(Request $request): JsonResponse
    {
        return $this->storeEvent($request, 'gasfahrt_stop', 'Gasfahrt stopped');
    }

    public function dienstbeginn(Request $request): JsonResponse
    {
        return $this->storeEvent($request, 'dienstbeginn', 'Dienstbeginn stored');
    }

    public function stopArbeit(Request $request): JsonResponse
    {
        $plannedExceeded = (bool) $request->boolean('planned_exceeded');
        $bemerkung = trim((string) $request->input('bemerkung', ''));

        if ($plannedExceeded && $bemerkung === '') {
            return response()->json([
                'message' => 'Bemerkung is required when planned time is exceeded.',
                'errors' => ['bemerkung' => ['Bemerkung is required.']],
            ], 422);
        }

        return $this->storeEvent($request, 'arbeit_stop', 'Work stopped');
    }

    public function startDienstfahrt(Request $request): JsonResponse
    {
        return $this->storeEvent($request, 'dienstfahrt_start', 'Dienstfahrt started');
    }

    public function stopDienstfahrt(Request $request): JsonResponse
    {
        return $this->storeEvent($request, 'dienstfahrt_stop', 'Dienstfahrt stopped');
    }

    private function storeEvent(Request $request, string $eventType, string $message): JsonResponse
    {
        $now = now();

        $id = DB::table('work_events')->insertGetId([
            'employee_id' => $request->input('employee_id'),
            'assignment_id' => $request->input('assignment_id'),
            'event_type' => $eventType,
            'event_time' => $now,
            'latitude' => $request->input('latitude'),
            'longitude' => $request->input('longitude'),
            'location_accuracy' => $request->input('location_accuracy'),
            'address_text' => $request->input('address_text'),
            'payload' => json_encode($request->input('payload', [])),
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        return response()->json([
            'message' => $message,
            'event' => [
                'id' => $id,
                'type' => $eventType,
                'stored' => true,
                'event_time' => $now->toISOString(),
            ],
        ]);
    }
}
