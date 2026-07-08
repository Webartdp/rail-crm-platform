# Work Event Approvals

Purpose:

Completed work and travel intervals must be approved before they are included in cost calculation and invoice drafts.

## API

List approval queue:

```text
GET /api/v1/work-event-approvals
```

The list endpoint also syncs completed event pairs into real pending approval rows.

Approve interval by ID:

```text
POST /api/v1/work-event-approvals/{id}/approve
```

Reject interval by ID:

```text
POST /api/v1/work-event-approvals/{id}/reject
```

## Stable approval ID

Each completed pair receives a real approval row with an `id`.

Frontend should approve/reject by this ID instead of sending employee_id/start_time/stop_time manually.

## Pair identity

Internally an approval is matched by:

- employee_id
- assignment_id
- pair_type
- start_time
- stop_time

## Pair types

- gasfahrt
- arbeit
- dienstfahrt

## Statuses

- pending
- approved
- rejected

## Billing rule

GET /api/v1/work-event-costs includes only approved intervals.

Pending and rejected intervals are not included in costs or invoices.
