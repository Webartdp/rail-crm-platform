# Employee Button States

## idle

Employee has an assignment, but no active event.

Allowed action:

- Gasfahrt

## gasfahrt_active

Employee is travelling from home to work.

Allowed action:

- Gasfahrt beendet

## arrived

Employee arrived at the work location.

Allowed action:

- Dienstbeginn

## work_active

Employee is working on the task.

Allowed action:

- Stop

Required task fields:

- Leistungsart
- Referenznummer
- Zugnummer
- Einsatzort

## work_overplanned_missing_note

Actual time is greater than planned time and Bemerkung is empty.

Stop is blocked until Bemerkung is filled.

## work_finished

Task is finished.

Allowed action:

- Start Dienstfahrt

## dienstfahrt_active

Employee is travelling to the next work location.

Allowed action:

- Stop Dienstfahrt

## dienstfahrt_finished

Employee arrived at the next location.

Allowed action:

- Dienstbeginn

## Rule

The backend should return current employee state and allowed actions. The frontend should display buttons based on backend state.
