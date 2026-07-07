# Workflow Order Enforcement

Backend is the source of truth for employee workflow order.

## Allowed order

1. gasfahrt_start
2. gasfahrt_stop
3. dienstbeginn
4. arbeit_stop
5. dienstfahrt_start
6. dienstfahrt_stop
7. dienstbeginn again for the next work location

## Backend behavior

WorkEventController checks the last stored event for the same employee and assignment before saving a new event.

If the requested action is not the next allowed action, backend returns HTTP 409.

Response contains:

- allowed_action
- requested_action

## Frontend behavior

The demo screen reads:

GET /api/v1/employee/field-state

It displays next_button from backend.

If an action is rejected, the demo refreshes field state and displays the next allowed action.
