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
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::get('/auth/me', [AuthController::class, 'me'])->middleware('role:employee,manager,admin');
    Route::post('/auth/logout', [AuthController::class, 'logout'])->middleware('role:employee,manager,admin');

    Route::get('/dashboard/manager', ManagerDashboardController::class)->middleware('role:manager,admin');

    Route::get('/employee/field-state', EmployeeFieldStateController::class)->middleware('role:employee,manager,admin');

    $allowDemoTools = fn (Request $request): bool => app()->environment(['local', 'staging', 'testing'])
        && $request->header('X-Local-Dev-Bypass') === 'rail-crm-dev';

    Route::post('/dev/reset-work-events', function (Request $request) use ($allowDemoTools) {
        abort_unless($allowDemoTools($request), 404);

        $employeeId = (int) $request->integer('employee_id', 1);
        $deleted = DB::table('work_events')->where('employee_id', $employeeId)->delete();
        DB::table('work_orders')->where('employee_id', $employeeId)->where('reference_number', 'like', 'BER-HBF-%')->update([
            'status' => 'planned',
            'updated_at' => now(),
        ]);

        return response()->json([
            'message' => 'Demo work events reset.',
            'employee_id' => $employeeId,
            'deleted' => $deleted,
        ]);
    });

    Route::post('/dev/field-demo-seed', function (Request $request) use ($allowDemoTools) {
        abort_unless($allowDemoTools($request), 404);

        $employeeId = (int) $request->integer('employee_id', 1);
        $now = now();
        $base = now()->copy()->addMinutes(15);
        $objectName = 'Berlin Hauptbahnhof';
        $objectAddress = 'Europaplatz 1, 10557 Berlin';

        $slot = function (int $startMinutes, int $durationMinutes) use ($base): array {
            $start = $base->copy()->addMinutes($startMinutes);
            $end = $start->copy()->addMinutes($durationMinutes);

            return [$start->toDateTimeString(), $end->toDateTimeString()];
        };

        [$start1, $end1] = $slot(0, 120);
        [$start2, $end2] = $slot(150, 90);
        [$start3, $end3] = $slot(255, 45);
        [$start4, $end4] = $slot(330, 60);
        [$start5, $end5] = $slot(405, 75);
        [$start6, $end6] = $slot(510, 60);

        $orders = [
            [
                'reference_number' => 'BER-HBF-K1-WTU-001',
                'customer_name' => 'Kunde 1 — DB Station Service',
                'work_title' => 'Gleis 12 Sicherheitskontrolle',
                'leistungsart' => 'WTU',
                'zugnummer' => 'ICE 204',
                'einsatzort' => 'Berlin Hbf / Gleis 12',
                'planned_start_at' => $start1,
                'planned_end_at' => $end1,
            ],
            [
                'reference_number' => 'BER-HBF-K2-WSU-001',
                'customer_name' => 'Kunde 2 — Rail Cargo GmbH',
                'work_title' => 'Wagenprüfung Eingang Nord',
                'leistungsart' => 'WSU',
                'zugnummer' => 'RC 8812',
                'einsatzort' => 'Berlin Hbf / Eingang Nord',
                'planned_start_at' => $start2,
                'planned_end_at' => $end2,
            ],
            [
                'reference_number' => 'BER-HBF-K2-EWU-002',
                'customer_name' => 'Kunde 2 — Rail Cargo GmbH',
                'work_title' => 'E-WU Dokumentation',
                'leistungsart' => 'E-WU',
                'zugnummer' => 'RC 8812',
                'einsatzort' => 'Berlin Hbf / Eingang Nord',
                'planned_start_at' => $start3,
                'planned_end_at' => $end3,
            ],
            [
                'reference_number' => 'BER-HBF-K2-RB-003',
                'customer_name' => 'Kunde 2 — Rail Cargo GmbH',
                'work_title' => 'Rb Kontrolle Rangierbereich',
                'leistungsart' => 'Rb',
                'zugnummer' => 'RB 4410',
                'einsatzort' => 'Berlin Hbf / Rangierbereich B',
                'planned_start_at' => $start4,
                'planned_end_at' => $end4,
            ],
            [
                'reference_number' => 'BER-HBF-K2-RID-004',
                'customer_name' => 'Kunde 2 — Rail Cargo GmbH',
                'work_title' => 'RID-Kontrolle Gefahrgut',
                'leistungsart' => 'RID-Kontrolle',
                'zugnummer' => 'RID 19',
                'einsatzort' => 'Berlin Hbf / Gleis 5',
                'planned_start_at' => $start5,
                'planned_end_at' => $end5,
            ],
            [
                'reference_number' => 'BER-HBF-K2-ZB-005',
                'customer_name' => 'Kunde 2 — Rail Cargo GmbH',
                'work_title' => 'Zugbeschtreifung Abschluss',
                'leistungsart' => 'Zugbeschtreifung',
                'zugnummer' => 'ICE 907',
                'einsatzort' => 'Berlin Hbf / Gleis 7',
                'planned_start_at' => $start6,
                'planned_end_at' => $end6,
            ],
        ];

        foreach ($orders as $order) {
            $details = [
                'object_name' => $objectName,
                'object_address' => $objectAddress,
                'customer_name' => $order['customer_name'],
                'work_title' => $order['work_title'],
                'leistungsart' => $order['leistungsart'],
                'zugnummer' => $order['zugnummer'],
                'einsatzort' => $order['einsatzort'],
            ];

            DB::table('work_orders')->updateOrInsert(
                ['reference_number' => $order['reference_number']],
                [
                    'employee_id' => $employeeId,
                    'title' => $order['work_title'],
                    'status' => 'planned',
                    'planned_start_at' => $order['planned_start_at'],
                    'planned_end_at' => $order['planned_end_at'],
                    'details' => json_encode($details),
                    'created_at' => $now,
                    'updated_at' => $now,
                ]
            );
        }

        return response()->json([
            'message' => 'Field demo data ready.',
            'object' => [
                'name' => $objectName,
                'address' => $objectAddress,
            ],
            'orders' => DB::table('work_orders')
                ->where('employee_id', $employeeId)
                ->where('reference_number', 'like', 'BER-HBF-%')
                ->orderBy('planned_start_at')
                ->get(),
        ]);
    });

    Route::get('/employee-profiles', [EmployeeProfileController::class, 'index'])->middleware('role:manager,admin');
    Route::post('/employee-profiles', [EmployeeProfileController::class, 'store'])->middleware('role:admin');
    Route::get('/employee-profiles/{id}', [EmployeeProfileController::class, 'show'])->middleware('role:employee,manager,admin');
    Route::put('/employee-profiles/{id}', [EmployeeProfileController::class, 'update'])->middleware('role:admin');

    Route::get('/work-orders', [WorkOrderController::class, 'index'])->middleware('role:employee,manager,admin');
    Route::post('/work-orders', [WorkOrderController::class, 'store'])->middleware('role:manager,admin');
    Route::get('/work-orders/{id}', [WorkOrderController::class, 'show'])->middleware('role:manager,admin');
    Route::put('/work-orders/{id}', [WorkOrderController::class, 'update'])->middleware('role:manager,admin');
    Route::delete('/work-orders/{id}', [WorkOrderController::class, 'destroy'])->middleware('role:manager,admin');
    Route::post('/work-orders/{id}/close', [WorkOrderController::class, 'close'])->middleware('role:manager,admin');

    Route::get('/work-events', [WorkEventController::class, 'index'])->middleware('role:employee,manager,admin');
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
