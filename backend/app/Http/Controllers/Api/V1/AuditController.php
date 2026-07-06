<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AuditController extends Controller
{
    public function __invoke(): JsonResponse
    {
        return response()->json([
            'data' => DB::table('audit_logs')->orderByDesc('created_at')->limit(100)->get(),
        ]);
    }
}
