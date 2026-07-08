# Work Event Approvals

Purpose:

Completed work and travel intervals must be approved before they are included in cost calculation.

## API

List approval queue:

```text
GET /api/v1/work-event-approvals
```

Approve interval:

```text
POST /api/v1/work-event-approvals/approve
```

Reject interval:

```text
POST /api/v1/work-event-approvals/reject
```

## Pair identity

Approval is matched by:

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

Pending and rejected intervals are not included in costs.
