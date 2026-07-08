<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DocumentController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => DB::table('documents')->orderByDesc('id')->limit(100)->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $title = trim((string) $request->input('title', ''));

        if ($title === '') {
            return response()->json([
                'message' => 'Document title is required.',
                'errors' => ['title' => ['Title is required.']],
            ], 422);
        }

        $now = now();
        $id = DB::table('documents')->insertGetId([
            'client_id' => $request->input('client_id'),
            'work_order_id' => $request->input('work_order_id'),
            'title' => $title,
            'type' => $request->input('type', 'report'),
            'status' => $request->input('status', 'draft'),
            'file_path' => $request->input('file_path'),
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        DB::table('audit_logs')->insert([
            'action' => 'document_created',
            'entity_type' => 'document',
            'entity_id' => $id,
            'payload' => json_encode(['title' => $title]),
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        return response()->json([
            'message' => 'Document created.',
            'data' => DB::table('documents')->where('id', $id)->first(),
        ], 201);
    }
}
