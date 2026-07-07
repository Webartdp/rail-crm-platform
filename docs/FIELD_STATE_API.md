# Field State API

Endpoint:

```text
GET /api/v1/employee/field-state?employee_id=1&assignment_id=1
```

Purpose:

Backend decides the current employee workflow state from stored work_events.

Response fields:

- employee_id
- assignment_id
- last_event_type
- current_state
- allowed_actions
- next_button
- required_fields
- planned_end_at
- planned_exceeded
- requires_bemerkung
- leistungsart_options

## State machine

No event:

- state: idle
- next: Gasfahrt

After gasfahrt_start:

- state: gasfahrt_active
- next: Gasfahrt beendet

After gasfahrt_stop:

- state: arrived
- next: Dienstbeginn

After dienstbeginn:

- state: work_active
- next: Stop

After arbeit_stop:

- state: work_finished
- next: Start Dienstfahrt

After dienstfahrt_start:

- state: dienstfahrt_active
- next: Stop Dienstfahrt

After dienstfahrt_stop:

- state: dienstfahrt_finished
- next: Dienstbeginn

## Stop rule

When next button is Stop, backend checks work_orders.planned_end_at.

If planned time is exceeded:

- planned_exceeded is true
- requires_bemerkung is true
- required_fields contains bemerkung

## Rule

Frontend should use allowed_actions, next_button and requires_bemerkung from this API.
It should not guess the next button or planned time rule locally.
