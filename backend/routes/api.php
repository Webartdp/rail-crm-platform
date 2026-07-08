<?php

use App\Http\Controllers\Api\V1\AuditController;
use App\Http\Controllers\Api\V1\EmployeeFieldStateController;
use App\Http\Controllers\Api\V1\EmployeeProfileController;
use App\Http\Controllers\Api\V1\WorkEventApprovalController;
use App\Http\Controllers\Api\V1\WorkEventController;
use App\Http\Controllers\Api\V1\WorkEventCostController;
use App\Http\Controllers\Api\V1\WorkEventDurationController;
use App\Http\Controllers\Api\V1\WorkOrderController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::get('/employee/field-state', EmployeeFieldStateController::class);
    Route::get('/employee-profiles', [EmployeeProfileController::class, 'index']);
    Route::post('/employee-profiles', [EmployeeProfileController::class, 'store']);
    Route::get('/employee-profiles/{id}', [EmployeeProfileController::class, 'show']);
    Route::put('/employee-profiles/{id}', [EmployeeProfileController::class, 'update']);
    Route::get('/work-orders', [WorkOrderController::class, 'index']);
    Route::post('/work-orders', [WorkOrderController::class, 'store']);
    Route::get('/work-events', [WorkEventController::class, 'index']);
    Route::get('/work-event-durations', WorkEventDurationController::class);
    Route::get('/work-event-costs', WorkEventCostController::class);
    Route::get('/work-event-approvals', [WorkEventApprovalController::class, 'index']);
    Route::post('/work-event-approvals/{id}/approve', [WorkEventApprovalController::class, 'approve']);
    Route::post('/work-event-approvals/{id}/reject', [WorkEventApprovalController::class, 'reject']);
    Route::get('/audit', AuditController::class);

    Route::post('/work-events/gasfahrt/start', [WorkEventController::class, 'startGasfahrt']);
    Route::post('/work-events/gasfahrt/stop', [WorkEventController::class, 'stopGasfahrt']);
    Route::post('/work-events/dienstbeginn', [WorkEventController::class, 'dienstbeginn']);
    Route::post('/work-events/arbeit/stop', [WorkEventController::class, 'stopArbeit']);
    Route::post('/work-events/dienstfahrt/start', [WorkEventController::class, 'startDienstfahrt']);
    Route::post('/work-events/dienstfahrt/stop', [WorkEventController::class, 'stopDienstfahrt']);
});
