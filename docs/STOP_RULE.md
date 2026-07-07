# Stop Rule

Requirement:

Stop is blocked when actual time exceeds planned time and Bemerkung is empty.

## Backend source of truth

Laravel checks selected work order planned_end_at.

If current backend time is later than planned_end_at and Bemerkung is empty, arbeit_stop returns validation error.

The backend also stores planned_exceeded in the work event payload.

## Field state

GET /api/v1/employee/field-state returns:

- planned_end_at
- planned_exceeded
- requires_bemerkung

Frontend must use these fields instead of calculating the rule locally.

## Frontend

The demo screen disables Stop when requires_bemerkung is true and Bemerkung is empty.

## Fallback

If a work order has no planned_end_at, backend can still use planned_exceeded from request as fallback.
