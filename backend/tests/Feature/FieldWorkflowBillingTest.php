<?php

namespace Tests\Feature;

use App\Models\AppUser;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class FieldWorkflowBillingTest extends TestCase
{
    use RefreshDatabase;

    public function test_employee_can_send_workflow_events_and_wrong_order_is_blocked(): void
    {
        $employeeToken = $this->tokenForRole('employee');
        $workOrderId = $this->createWorkOrder();

        $this->withHeader('Authorization', 'Bearer '.$employeeToken)
            ->postJson('/api/v1/work-events/dienstbeginn', [
                'employee_id' => 1,
                'assignment_id' => $workOrderId,
                'payload' => [
                    'date' => '2026-07-06',
                    'leistungsart' => 'WTU',
                    'referenznummer' => 'REF-TEST-001',
                    'zugnummer' => 'ICE 204',
                    'einsatzort' => 'Gleis 12',
                ],
            ])
            ->assertStatus(409);

        $this->withHeader('Authorization', 'Bearer '.$employeeToken)
            ->postJson('/api/v1/work-events/gasfahrt/start', [
                'employee_id' => 1,
                'assignment_id' => $workOrderId,
                'latitude' => 48.137154,
                'longitude' => 11.576124,
            ])
            ->assertCreated()
            ->assertJsonPath('data.event_type', 'gasfahrt_start');
    }

    public function test_manager_can_approve_interval_and_create_invoice_draft(): void
    {
        $managerToken = $this->tokenForRole('manager');
        $workOrderId = $this->createWorkOrder();
        $this->createEmployeeProfile();
        $this->createCompletedWorkEvents($workOrderId);

        $approvalId = $this->withHeader('Authorization', 'Bearer '.$managerToken)
            ->getJson('/api/v1/work-event-approvals')
            ->assertOk()
            ->json('data.0.id');

        $this->assertNotEmpty($approvalId);

        $this->withHeader('Authorization', 'Bearer '.$managerToken)
            ->postJson('/api/v1/work-event-approvals/'.$approvalId.'/approve', ['comment' => 'Approved in feature test.'])
            ->assertOk()
            ->assertJsonPath('data.status', 'approved');

        $this->withHeader('Authorization', 'Bearer '.$managerToken)
            ->getJson('/api/v1/work-event-costs')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.approval_status', 'approved');

        $this->withHeader('Authorization', 'Bearer '.$managerToken)
            ->postJson('/api/v1/invoices')
            ->assertCreated()
            ->assertJsonStructure(['data' => ['id', 'number', 'status'], 'items']);

        $this->assertDatabaseHas('work_orders', [
            'id' => $workOrderId,
            'status' => 'invoiced',
        ]);
    }

    public function test_employee_cannot_view_costs_or_create_invoice(): void
    {
        $employeeToken = $this->tokenForRole('employee');

        $this->withHeader('Authorization', 'Bearer '.$employeeToken)
            ->getJson('/api/v1/work-event-costs')
            ->assertForbidden();

        $this->withHeader('Authorization', 'Bearer '.$employeeToken)
            ->postJson('/api/v1/invoices')
            ->assertForbidden();
    }

    private function createEmployeeProfile(): void
    {
        DB::table('employee_profiles')->insert([
            'id' => 1,
            'first_name' => 'Max',
            'last_name' => 'Muller',
            'standard_hourly_rate' => 28,
            'travel_hourly_rate' => 0,
            'night_coefficient' => 1.25,
            'sunday_coefficient' => 1.5,
            'holiday_coefficient' => 2,
            'home_location' => 'Dresden',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function createCompletedWorkEvents(int $workOrderId): void
    {
        DB::table('work_events')->insert([
            [
                'employee_id' => 1,
                'assignment_id' => $workOrderId,
                'event_type' => 'dienstbeginn',
                'event_time' => '2026-07-06 08:00:00',
                'payload' => json_encode(['is_night' => false, 'is_sunday' => false, 'is_holiday' => false]),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'employee_id' => 1,
                'assignment_id' => $workOrderId,
                'event_type' => 'arbeit_stop',
                'event_time' => '2026-07-06 10:00:00',
                'payload' => json_encode(['is_night' => false, 'is_sunday' => false, 'is_holiday' => false]),
                'created_at' => now(),
                'updated_at' => now(),
            ],
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
            'employee_profile_id' => $role === 'employee' ? 1 : null,
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
