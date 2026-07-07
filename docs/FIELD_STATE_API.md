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

## Rule

Frontend should use allowed_actions and next_button from this API.
It should not guess the next button locally.
