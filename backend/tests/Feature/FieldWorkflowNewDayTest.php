<?php

namespace Tests\Feature;

use App\Support\FieldWorkflow;
use Carbon\Carbon;
use PHPUnit\Framework\TestCase;

class FieldWorkflowNewDayTest extends TestCase
{
    public function test_new_day_starts_with_gasfahrt_after_a_long_break(): void
    {
        $stop = (object) ['event_type' => 'arbeit_stop', 'event_time' => '2026-10-06 17:00:00'];

        $this->assertSame('arbeit_stop', FieldWorkflow::effectiveLastType($stop, Carbon::parse('2026-10-06 19:00:00')));
        $this->assertNull(FieldWorkflow::effectiveLastType($stop, Carbon::parse('2026-10-07 07:00:00')));
    }

    public function test_running_work_is_never_reset(): void
    {
        $start = (object) ['event_type' => 'dienstbeginn', 'event_time' => '2026-10-06 20:00:00'];

        $this->assertSame('dienstbeginn', FieldWorkflow::effectiveLastType($start, Carbon::parse('2026-10-07 09:00:00')));
    }
}
