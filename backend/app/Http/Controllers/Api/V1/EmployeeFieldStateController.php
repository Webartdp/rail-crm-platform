<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class EmployeeFieldStateController extends Controller
{
    public function __invoke(): JsonResponse
    {
        return response()->json([
            'current_state' => 'idle',
            'allowed_actions' => [
                'gasfahrt_start',
            ],
            'required_fields' => [],
            'assignment' => [
                'id' => 1,
                'leistungsart_options' => [
                    'WTU',
                    'WSU',
                    'E-WU',
                    'Rb',
                    'Azf',
                    'RID-Kontrolle',
                    'Zugbeschtreifung',
                    'custom',
                ],
            ],
        ]);
    }
}
