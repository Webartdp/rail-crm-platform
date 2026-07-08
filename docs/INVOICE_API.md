# Invoice API

Purpose:

Create invoice drafts from approved, uninvoiced cost items.

## API

List invoices:

```text
GET /api/v1/invoices
```

Create invoice draft:

```text
POST /api/v1/invoices
```

Show invoice with items:

```text
GET /api/v1/invoices/{id}
```

## Source rule

Invoice draft source:

```text
approved work_event_approvals
```

Only approved intervals are included.

Pending/rejected intervals are excluded.

Already invoiced approval rows are skipped so they are not billed twice.

## Invoice items

Each invoice item stores:

- approval_id
- employee_id
- assignment_id
- type
- hours
- hourly_rate
- coefficient
- amount

## Work order status

When an invoice draft is created, related work_orders are marked as:

```text
invoiced
```
