# Work Event Duration Rules

## Event pairs

Gasfahrt:

- gasfahrt_start
- gasfahrt_stop

Work task:

- dienstbeginn
- arbeit_stop

Dienstfahrt:

- dienstfahrt_start
- dienstfahrt_stop

## Calculation

For each employee and assignment:

1. sort events by event_time
2. remember latest start event
3. when matching stop event appears, calculate minutes
4. return duration_minutes

## Output fields

- type
- start_event
- stop_event
- start_time
- stop_time
- duration_minutes
- employee_id
- assignment_id

## Rule

Do not mix employees or assignments.
