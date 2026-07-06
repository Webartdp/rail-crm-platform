<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class WorkOrderController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => DB::table('work_orders')->orderByDesc('id')->limit(100)->get(),
        ]);
    }
}
