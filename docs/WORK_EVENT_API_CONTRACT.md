# Work Event API Contract

## Base path

/api/v1/work-events

## Event types

- gasfahrt_start
- gasfahrt_stop
- dienstbeginn
- arbeit_stop
- dienstfahrt_start
- dienstfahrt_stop

## Common request fields

- employee_id
- assignment_id
- latitude
- longitude
- location_accuracy
- address_text
- payload

## Dienstbeginn payload

- leistungsart
- referenznummer
- zugnummer
- einsatzort

## Arbeit Stop payload

- planned_exceeded
- bemerkung

## Validation rule

If planned_exceeded is true, bemerkung is required.

This rule must be checked by backend even if frontend already blocks the button.

## Response should include

- message
- event id
- event type
- event time
- next state
- allowed actions
