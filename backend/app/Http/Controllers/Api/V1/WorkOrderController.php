<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WorkOrderController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => DB::table('work_orders')->orderByDesc('id')->limit(100)->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $title = trim((string) $request->input('title', ''));

        if ($title === '') {
            return response()->json([
                'message' => 'Work order title is required.',
                'errors' => ['title' => ['Title is required.']],
            ], 422);
        }

        $now = now();
        $details = [
            'leistungsart' => $request->input('leistungsart'),
            'zugnummer' => $request->input('zugnummer'),
            'einsatzort' => $request->input('einsatzort'),
        ];

        $id = DB::table('work_orders')->insertGetId([
            'title' => $title,
            'reference_number' => $request->input('reference_number'),
            'status' => $request->input('status', 'planned'),
            'planned_start_at' => $request->input('planned_start_at'),
            'planned_end_at' => $request->input('planned_end_at'),
            'details' => json_encode($details),
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        return response()->json([
            'message' => 'Work order created.',
            'data' => DB::table('work_orders')->where('id', $id)->first(),
        ], 201);
    }
}
