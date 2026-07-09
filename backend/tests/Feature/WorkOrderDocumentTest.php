<?php

namespace Tests\Feature;

use App\Models\AppUser;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class WorkOrderDocumentTest extends TestCase
{
    use RefreshDatabase;

    public function test_employee_cannot_create_work_order_but_manager_can(): void
    {
        $employeeToken = $this->tokenForRole('employee');
        $managerToken = $this->tokenForRole('manager');

        $payload = [
            'employee_id' => 1,
            'title' => 'WTU / ICE 204 / Gleis 12',
            'reference_number' => 'REF-TEST-001',
            'leistungsart' => 'WTU',
            'zugnummer' => 'ICE 204',
            'einsatzort' => 'Gleis 12',
            'planned_start_at' => '2026-07-06T07:30',
            'planned_end_at' => '2026-07-06T15:30',
        ];

        $this->withHeader('Authorization', 'Bearer '.$employeeToken)
            ->postJson('/api/v1/work-orders', $payload)
            ->assertForbidden();

        $this->withHeader('Authorization', 'Bearer '.$managerToken)
            ->postJson('/api/v1/work-orders', $payload)
            ->assertCreated()
            ->assertJsonPath('data.status', 'planned');
    }

    public function test_manager_can_close_work_order_and_audit_is_written(): void
    {
        $managerToken = $this->tokenForRole('manager');
        $workOrderId = $this->createWorkOrder();

        $this->withHeader('Authorization', 'Bearer '.$managerToken)
            ->postJson('/api/v1/work-orders/'.$workOrderId.'/close', ['source' => 'feature_test'])
            ->assertOk()
            ->assertJsonPath('data.status', 'closed');

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'work_order_closed',
            'entity_type' => 'work_order',
            'entity_id' => $workOrderId,
        ]);
    }

    public function test_employee_cannot_create_document_but_manager_can_request_signature(): void
    {
        $employeeToken = $this->tokenForRole('employee');
        $managerToken = $this->tokenForRole('manager');
        $workOrderId = $this->createWorkOrder();

        $documentPayload = [
            'title' => 'Report REF-TEST-001',
            'type' => 'report',
            'status' => 'draft',
            'work_order_id' => $workOrderId,
        ];

        $this->withHeader('Authorization', 'Bearer '.$employeeToken)
            ->postJson('/api/v1/documents', $documentPayload)
            ->assertForbidden();

        $documentId = $this->withHeader('Authorization', 'Bearer '.$managerToken)
            ->postJson('/api/v1/documents', $documentPayload)
            ->assertCreated()
            ->assertJsonPath('data.title', 'Report REF-TEST-001')
            ->json('data.id');

        $this->withHeader('Authorization', 'Bearer '.$managerToken)
            ->postJson('/api/v1/documents/'.$documentId.'/signatures', [
                'signer_name' => 'Max Muller',
                'signer_email' => 'max@example.com',
                'signature_type' => 'canvas',
            ])
            ->assertCreated()
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.signature_type', 'canvas');
    }

    public function test_authenticated_employee_can_sign_pending_document_signature(): void
    {
        $managerToken = $this->tokenForRole('manager');
        $employeeToken = $this->tokenForRole('employee');
        $workOrderId = $this->createWorkOrder();

        $documentId = $this->withHeader('Authorization', 'Bearer '.$managerToken)
            ->postJson('/api/v1/documents', [
                'title' => 'Report for signature',
                'type' => 'report',
                'status' => 'draft',
                'work_order_id' => $workOrderId,
            ])
            ->json('data.id');

        $signatureId = $this->withHeader('Authorization', 'Bearer '.$managerToken)
            ->postJson('/api/v1/documents/'.$documentId.'/signatures', [
                'signer_name' => 'Employee User',
                'signature_type' => 'typed',
            ])
            ->json('data.id');

        $this->withHeader('Authorization', 'Bearer '.$employeeToken)
            ->postJson('/api/v1/documents/'.$documentId.'/signatures/'.$signatureId.'/sign', [
                'signature_type' => 'typed',
                'signature_data' => 'Signed by employee',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'signed');

        $this->assertDatabaseHas('documents', [
            'id' => $documentId,
            'status' => 'signed',
        ]);
    }

    private function createWorkOrder(): int
    {
        return DB::table('work_orders')->insertGetId([
            'employee_id' => 1,
            'title' => 'WTU / ICE 204 / Gleis 12',
            'reference_number' => 'REF-TEST-001',
            'status' => 'planned',
            'planned_start_at' => '2026-07-06T07:30',
            'planned_end_at' => '2026-07-06T15:30',
            'details' => json_encode(['leistungsart' => 'WTU']),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function tokenForRole(string $role): string
    {
        $id = DB::table('app_users')->insertGetId([
            'name' => ucfirst($role).' User',
            'email' => $role.uniqid().'@example.com',
            'password_hash' => Hash::make('password'),
            'role' => $role,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return AppUser::query()->findOrFail($id)->createToken('test-token', [$role])->plainTextToken;
    }
}
