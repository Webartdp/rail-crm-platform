<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WorkEventController extends Controller
{
    public function startGasfahrt(Request $request): JsonResponse
    {
        return $this->stored('gasfahrt_start', 'Gasfahrt started');
    }

    public function stopGasfahrt(Request $request): JsonResponse
    {
        return $this->stored('gasfahrt_stop', 'Gasfahrt stopped');
    }

    public function dienstbeginn(Request $request): JsonResponse
    {
        return $this->stored('dienstbeginn', 'Dienstbeginn stored');
    }

    public function stopArbeit(Request $request): JsonResponse
    {
        $plannedExceeded = (bool) $request->boolean('planned_exceeded');
        $bemerkung = trim((string) $request->input('bemerkung', ''));

        if ($plannedExceeded && $bemerkung === '') {
            return response()->json([
                'message' => 'Bemerkung is required when planned time is exceeded.',
                'errors' => [
                    'bemerkung' => ['Bemerkung is required.'],
                ],
            ], 422);
        }

        return $this->stored('arbeit_stop', 'Work stopped');
    }

    public function startDienstfahrt(Request $request): JsonResponse
    {
        return $this->stored('dienstfahrt_start', 'Dienstfahrt started');
    }

    public function stopDienstfahrt(Request $request): JsonResponse
    {
        return $this->stored('dienstfahrt_stop', 'Dienstfahrt stopped');
    }

    private function stored(string $eventType, string $message): JsonResponse
    {
        return response()->json([
            'message' => $message,
            'event' => [
                'type' => $eventType,
                'stored' => true,
            ],
        ]);
    }
}
