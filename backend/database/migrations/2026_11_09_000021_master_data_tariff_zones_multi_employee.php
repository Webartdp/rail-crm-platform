<?php

use Carbon\Carbon;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Clients and their objects are master data maintained by the admin.
        Schema::table('clients', function (Blueprint $table) {
            $table->string('address')->nullable()->after('name');
            $table->string('contact_person')->nullable()->after('address');
            $table->string('email')->nullable()->after('contact_person');
            $table->string('phone')->nullable()->after('email');
            $table->text('notes')->nullable()->after('phone');
        });

        // Object address is the Einsatzort.
        Schema::table('objects', function (Blueprint $table) {
            $table->string('address')->nullable()->after('name');
            $table->text('notes')->nullable()->after('address');
            $table->index('client_id');
        });
        DB::table('objects')->whereNull('address')->update(['address' => DB::raw('location')]);

        // Several employees per work order.
        Schema::create('work_order_employees', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('work_order_id')->index();
            $table->unsignedBigInteger('employee_id')->index();
            $table->timestamps();
            $table->unique(['work_order_id', 'employee_id']);
        });

        // Automatic night zones (tariffs 2–4). Tariff 1 (06–20) is the base rate.
        Schema::table('employee_profiles', function (Blueprint $table) {
            $table->decimal('night_20_24_coefficient', 6, 3)->default(1.25)->after('night_coefficient');
            $table->decimal('night_00_04_coefficient', 6, 3)->default(1.40)->after('night_20_24_coefficient');
            $table->decimal('night_04_06_coefficient', 6, 3)->default(1.25)->after('night_00_04_coefficient');
        });
        // Existing employees keep the night factor they had.
        DB::table('employee_profiles')->update([
            'night_20_24_coefficient' => DB::raw('night_coefficient'),
            'night_00_04_coefficient' => DB::raw('night_coefficient'),
            'night_04_06_coefficient' => DB::raw('night_coefficient'),
        ]);

        Schema::table('invoice_items', function (Blueprint $table) {
            $table->string('tariff_zone', 30)->nullable()->after('type');
            $table->string('day_type', 20)->nullable()->after('tariff_zone');
        });

        // Extra regional holidays (nationwide German holidays are computed).
        Schema::create('holidays', function (Blueprint $table) {
            $table->id();
            $table->date('date')->unique();
            $table->string('name');
            $table->timestamps();
        });

        $this->backfillClientsAndObjects();
        $this->backfillAssignedEmployees();
        $this->shiftEventTimesToBusinessTimezone();
    }

    public function down(): void
    {
        Schema::dropIfExists('holidays');
        Schema::table('invoice_items', fn (Blueprint $table) => $table->dropColumn(['tariff_zone', 'day_type']));
        Schema::table('employee_profiles', fn (Blueprint $table) => $table->dropColumn(['night_20_24_coefficient', 'night_00_04_coefficient', 'night_04_06_coefficient']));
        Schema::dropIfExists('work_order_employees');
        Schema::table('objects', function (Blueprint $table) {
            $table->dropIndex(['client_id']);
            $table->dropColumn(['address', 'notes']);
        });
        Schema::table('clients', fn (Blueprint $table) => $table->dropColumn(['address', 'contact_person', 'email', 'phone', 'notes']));
    }

    /** Turn customer/object names stored inside work_orders.details into real records. */
    private function backfillClientsAndObjects(): void
    {
        $now = now();

        foreach (DB::table('work_orders')->get() as $order) {
            $details = json_decode((string) $order->details, true) ?: [];
            $clientName = trim((string) ($details['customer_name'] ?? ''));
            $objectName = trim((string) ($details['object_name'] ?? ''));
            $address = trim((string) ($details['object_address'] ?? '')) ?: trim((string) ($details['einsatzort'] ?? ''));

            $clientId = $order->client_id;
            if (!$clientId && $clientName !== '') {
                $clientId = DB::table('clients')->where('name', $clientName)->value('id')
                    ?: DB::table('clients')->insertGetId(['name' => $clientName, 'status' => 'active', 'created_at' => $now, 'updated_at' => $now]);
            }

            $objectId = $order->object_id;
            if (!$objectId && $objectName !== '') {
                $objectId = DB::table('objects')->where('name', $objectName)->where('client_id', $clientId)->value('id')
                    ?: DB::table('objects')->insertGetId([
                        'client_id' => $clientId,
                        'name' => $objectName,
                        'address' => $address ?: null,
                        'location' => $address ?: null,
                        'status' => 'active',
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
            }

            DB::table('work_orders')->where('id', $order->id)->update(['client_id' => $clientId, 'object_id' => $objectId]);
        }
    }

    private function backfillAssignedEmployees(): void
    {
        $now = now();
        foreach (DB::table('work_orders')->whereNotNull('employee_id')->get(['id', 'employee_id']) as $order) {
            DB::table('work_order_employees')->insertOrIgnore([
                'work_order_id' => $order->id,
                'employee_id' => $order->employee_id,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    /**
     * Until now event times were saved in UTC while planned times were local.
     * From now on everything is Europe/Berlin wall-clock time.
     */
    private function shiftEventTimesToBusinessTimezone(): void
    {
        $zone = (string) config('app.timezone', 'Europe/Berlin');
        if ($zone === 'UTC') {
            return;
        }

        $convert = fn (?string $value) => $value === null
            ? null
            : Carbon::parse($value, 'UTC')->setTimezone($zone)->format('Y-m-d H:i:s');

        foreach (DB::table('work_events')->get(['id', 'event_time']) as $event) {
            DB::table('work_events')->where('id', $event->id)->update(['event_time' => $convert($event->event_time)]);
        }

        // Shift newest first so the unique pair index never collides.
        foreach (DB::table('work_event_approvals')->orderByDesc('start_time')->get(['id', 'start_time', 'stop_time', 'approved_at']) as $approval) {
            DB::table('work_event_approvals')->where('id', $approval->id)->update([
                'start_time' => $convert($approval->start_time),
                'stop_time' => $convert($approval->stop_time),
                'approved_at' => $convert($approval->approved_at),
            ]);
        }
    }
};
