<?php

namespace Tests\Feature;

use App\Models\AppUser;
use App\Support\TariffZones;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class TimesheetAndZonesTest extends TestCase
{
    use RefreshDatabase;

    public function test_night_shift_is_split_into_tariff_zones(): void
    {
        $zones = collect(TariffZones::split('2026-11-09 18:00:00', '2026-11-10 07:00:00'))
            ->groupBy('zone')->map(fn ($segments) => $segments->sum('minutes'));

        $this->assertSame(180, $zones['day']);          // 18–20 + 06–07
        $this->assertSame(240, $zones['night_20_24']);
        $this->assertSame(240, $zones['night_00_04']);
        $this->assertSame(120, $zones['night_04_06']);
    }

    public function test_employee_timesheet_shows_only_own_time_and_zone_hours(): void
    {
        DB::table('employee_profiles')->insert([
            ['id' => 1, 'first_name' => 'Max', 'last_name' => 'Müller', 'standard_hourly_rate' => 30, 'created_at' => now(), 'updated_at' => now()],
            ['id' => 2, 'first_name' => 'Anna', 'last_name' => 'Schmidt', 'standard_hourly_rate' => 30, 'created_at' => now(), 'updated_at' => now()],
        ]);
        $orderId = DB::table('work_orders')->insertGetId([
            'employee_id' => 1, 'title' => 'WTU', 'status' => 'waiting_approval',
            'planned_start_at' => '2026-11-09 22:00:00', 'planned_end_at' => '2026-11-10 05:00:00',
            'details' => json_encode(['customer_name' => 'DB Cargo', 'object_name' => 'Gleis 5']),
            'created_at' => now(), 'updated_at' => now(),
        ]);
        foreach ([[1, 'dienstbeginn', '2026-11-09 22:00:00'], [1, 'arbeit_stop', '2026-11-10 05:00:00'], [2, 'dienstbeginn', '2026-11-09 08:00:00'], [2, 'arbeit_stop', '2026-11-09 10:00:00']] as [$employee, $type, $time]) {
            DB::table('work_events')->insert(['employee_id' => $employee, 'assignment_id' => $orderId, 'event_type' => $type, 'event_time' => $time, 'payload' => '{}', 'created_at' => now(), 'updated_at' => now()]);
        }

        $token = $this->token('employee', 1);
        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/reports/timesheet?date_from=2026-11-01&date_to=2026-11-30&employee_id=2')
            ->assertOk();

        // employee_id=2 is ignored for employees: they only get their own sheet.
        $response->assertJsonPath('data.employee.id', 1)
            ->assertJsonPath('data.totals.work', 420)
            ->assertJsonPath('data.totals.night_20_24', 120)
            ->assertJsonPath('data.totals.night_00_04', 240)
            ->assertJsonPath('data.totals.night_04_06', 60)
            ->assertJsonPath('data.totals.planned', 420);
    }

    public function test_employee_can_correct_pending_time_but_not_approved_time(): void
    {
        DB::table('employee_profiles')->insert(['id' => 1, 'first_name' => 'Max', 'created_at' => now(), 'updated_at' => now()]);
        $start = DB::table('work_events')->insertGetId(['employee_id' => 1, 'assignment_id' => 7, 'event_type' => 'dienstbeginn', 'event_time' => '2026-11-09 08:05:00', 'payload' => '{}', 'created_at' => now(), 'updated_at' => now()]);
        $stop = DB::table('work_events')->insertGetId(['employee_id' => 1, 'assignment_id' => 7, 'event_type' => 'arbeit_stop', 'event_time' => '2026-11-09 17:40:00', 'payload' => '{}', 'created_at' => now(), 'updated_at' => now()]);
        $token = $this->token('employee', 1);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/work-events/correct', [
                'start_event_id' => $start, 'stop_event_id' => $stop,
                'start_time' => '2026-11-09 07:00:00', 'stop_time' => '2026-11-09 16:00:00', 'bemerkung' => 'Vergessen zu drücken',
            ])
            ->assertOk();

        $this->assertDatabaseHas('work_events', ['id' => $start, 'event_time' => '2026-11-09 07:00:00']);

        DB::table('work_event_approvals')->insert([
            'employee_id' => 1, 'assignment_id' => 7, 'pair_type' => 'arbeit',
            'start_time' => '2026-11-09 07:00:00', 'stop_time' => '2026-11-09 16:00:00', 'status' => 'approved',
            'created_at' => now(), 'updated_at' => now(),
        ]);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/work-events/correct', [
                'start_event_id' => $start, 'stop_event_id' => $stop,
                'start_time' => '2026-11-09 06:00:00', 'stop_time' => '2026-11-09 16:00:00',
            ])
            ->assertStatus(422);
    }

    private function token(string $role, ?int $profileId = null): string
    {
        $id = DB::table('app_users')->insertGetId([
            'employee_profile_id' => $profileId,
            'name' => ucfirst($role), 'email' => $role.uniqid().'@example.com',
            'password_hash' => Hash::make('Password123'), 'role' => $role, 'is_active' => true,
            'created_at' => now(), 'updated_at' => now(),
        ]);

        return AppUser::query()->findOrFail($id)->createToken('t', [$role])->plainTextToken;
    }
}
