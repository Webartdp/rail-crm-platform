<?php

use App\Http\Controllers\Api\V1\AuditController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\DocumentController;
use App\Http\Controllers\Api\V1\DocumentSignatureController;
use App\Http\Controllers\Api\V1\EmployeeFieldStateController;
use App\Http\Controllers\Api\V1\EmployeeProfileController;
use App\Http\Controllers\Api\V1\InvoiceController;
use App\Http\Controllers\Api\V1\ManagerDashboardController;
use App\Http\Controllers\Api\V1\WorkEventApprovalController;
use App\Http\Controllers\Api\V1\WorkEventController;
use App\Http\Controllers\Api\V1\WorkEventCostController;
use App\Http\Controllers\Api\V1\WorkEventDurationController;
use App\Http\Controllers\Api\V1\WorkOrderController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::get('/auth/me', [AuthController::class, 'me'])->middleware('role:employee,manager,admin');
    Route::post('/auth/logout', [AuthController::class, 'logout'])->middleware('role:employee,manager,admin');

    Route::get('/dashboard/manager', ManagerDashboardController::class)->middleware('role:manager,admin');

    Route::get('/employee/field-state', EmployeeFieldStateController::class);

    Route::get('/employee-profiles', [EmployeeProfileController::class, 'index'])->middleware('role:admin');
    Route::post('/employee-profiles', [EmployeeProfileController::class, 'store'])->middleware('role:admin');
    Route::get('/employee-profiles/{id}', [EmployeeProfileController::class, 'show'])->middleware('role:admin');
    Route::put('/employee-profiles/{id}', [EmployeeProfileController::class, 'update'])->middleware('role:admin');

    Route::get('/work-orders', [WorkOrderController::class, 'index'])->middleware('role:employee,manager,admin');
    Route::post('/work-orders', [WorkOrderController::class, 'store'])->middleware('role:manager,admin');
    Route::post('/work-orders/{id}/close', [WorkOrderController::class, 'close'])->middleware('role:manager,admin');

    Route::get('/work-events', [WorkEventController::class, 'index'])->middleware('role:manager,admin');
    Route::get('/work-event-durations', WorkEventDurationController::class)->middleware('role:manager,admin');
    Route::get('/work-event-costs', WorkEventCostController::class)->middleware('role:manager,admin');
    Route::get('/work-event-approvals', [WorkEventApprovalController::class, 'index'])->middleware('role:manager,admin');
    Route::post('/work-event-approvals/{id}/approve', [WorkEventApprovalController::class, 'approve'])->middleware('role:manager,admin');
    Route::post('/work-event-approvals/{id}/reject', [WorkEventApprovalController::class, 'reject'])->middleware('role:manager,admin');

    Route::get('/invoices', [InvoiceController::class, 'index'])->middleware('role:manager,admin');
    Route::post('/invoices', [InvoiceController::class, 'store'])->middleware('role:manager,admin');
    Route::get('/invoices/{id}', [InvoiceController::class, 'show'])->middleware('role:manager,admin');

    Route::get('/documents', [DocumentController::class, 'index'])->middleware('role:manager,admin');
    Route::post('/documents', [DocumentController::class, 'store'])->middleware('role:manager,admin');
    Route::get('/documents/{id}', [DocumentController::class, 'show'])->middleware('role:manager,admin');
    Route::get('/documents/{id}/download', [DocumentController::class, 'download'])->middleware('role:manager,admin');
    Route::get('/documents/{id}/print-data', [DocumentController::class, 'printData'])->middleware('role:manager,admin');
    Route::post('/documents/{id}/ocr/start', [DocumentController::class, 'startOcr'])->middleware('role:manager,admin');
    Route::post('/documents/{id}/ocr/text', [DocumentController::class, 'saveOcrText'])->middleware('role:manager,admin');
    Route::get('/documents/{documentId}/signatures', [DocumentSignatureController::class, 'index'])->middleware('role:employee,manager,admin');
    Route::post('/documents/{documentId}/signatures', [DocumentSignatureController::class, 'requestSignature'])->middleware('role:manager,admin');
    Route::post('/documents/{documentId}/signatures/{signatureId}/sign', [DocumentSignatureController::class, 'sign'])->middleware('role:employee,manager,admin');
    Route::post('/documents/{documentId}/signatures/{signatureId}/reject', [DocumentSignatureController::class, 'reject'])->middleware('role:employee,manager,admin');

    Route::get('/audit', AuditController::class)->middleware('role:manager,admin');

    Route::post('/work-events/gasfahrt/start', [WorkEventController::class, 'startGasfahrt'])->middleware('role:employee,manager,admin');
    Route::post('/work-events/gasfahrt/stop', [WorkEventController::class, 'stopGasfahrt'])->middleware('role:employee,manager,admin');
    Route::post('/work-events/dienstbeginn', [WorkEventController::class, 'dienstbeginn'])->middleware('role:employee,manager,admin');
    Route::post('/work-events/arbeit/stop', [WorkEventController::class, 'stopArbeit'])->middleware('role:employee,manager,admin');
    Route::post('/work-events/dienstfahrt/start', [WorkEventController::class, 'startDienstfahrt'])->middleware('role:employee,manager,admin');
    Route::post('/work-events/dienstfahrt/stop', [WorkEventController::class, 'stopDienstfahrt'])->middleware('role:employee,manager,admin');
});
