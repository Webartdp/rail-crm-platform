<?php

use App\Http\Controllers\Api\V1\EmployeeFieldStateController;
use App\Http\Controllers\Api\V1\WorkEventController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::get('/employee/field-state', EmployeeFieldStateController::class);

    Route::post('/work-events/gasfahrt/start', [WorkEventController::class, 'startGasfahrt']);
    Route::post('/work-events/gasfahrt/stop', [WorkEventController::class, 'stopGasfahrt']);
    Route::post('/work-events/dienstbeginn', [WorkEventController::class, 'dienstbeginn']);
    Route::post('/work-events/arbeit/stop', [WorkEventController::class, 'stopArbeit']);
    Route::post('/work-events/dienstfahrt/start', [WorkEventController::class, 'startDienstfahrt']);
    Route::post('/work-events/dienstfahrt/stop', [WorkEventController::class, 'stopDienstfahrt']);
});
