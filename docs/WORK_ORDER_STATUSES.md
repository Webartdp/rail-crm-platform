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

## Not implemented yet

Closed status is reserved for final archive/completion logic.
