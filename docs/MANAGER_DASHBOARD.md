# Manager Dashboard

Purpose:

Give managers and admins one operational overview page.

## API

```text
GET /api/v1/dashboard/manager
```

Requires:

```text
manager / admin
```

## Counts

The endpoint returns counts for:

- pending_approvals
- approved_uninvoiced
- documents_needing_signature
- open_work_orders

## Lists

The endpoint also returns short lists for:

- pending work_event_approvals
- approved but not invoiced work_event_approvals
- pending document signatures with document title
- open work orders

## Frontend

```text
/manager-dashboard
```

The page shows:

- summary stat cards
- pending approvals table
- approved but uninvoiced table
- documents needing signature table
- open work orders table

## Links

Dashboard links to:

- /approvals
- /billing
- /documents
- /assignments

## Rule

This dashboard is for management work only and should not be visible to ordinary employees in future route guards.
