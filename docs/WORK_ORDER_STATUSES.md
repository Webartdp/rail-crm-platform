# Work Order Statuses

Purpose:

Work order status shows where an assignment is in the operational workflow.

## Statuses

```text
planned
in_progress
waiting_approval
approved
invoiced
closed
```

## Current automatic transitions

Created work order:

```text
planned
```

Any workflow activity before final approval:

```text
in_progress
```

After arbeit_stop:

```text
waiting_approval
```

After approval:

```text
approved
```

After invoice draft creation:

```text
invoiced
```

## Manual close

A manager/admin can close a work order manually:

```text
POST /api/v1/work-orders/{id}/close
```

The endpoint changes status to:

```text
closed
```

and writes audit action:

```text
work_order_closed
```

## Frontend close actions

Close is available in:

```text
/assignments
/documents/{id}/print
```

## Rule

Only manager/admin can close work orders.
