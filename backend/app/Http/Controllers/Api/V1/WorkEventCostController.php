<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Support\TimeLedger;
use Illuminate\Http\JsonResponse;

/** Approved, not yet invoiced time priced with the employee tariff and night zones. */
class WorkEventCostController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $lines = array_map(fn (array $line) => $line + ['approval_status' => 'approved'], TimeLedger::billableLines());

        return response()->json(['data' => array_reverse($lines)]);
    }
}
