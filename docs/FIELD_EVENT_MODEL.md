# Field Event Model

## Goal

Represent all employee button actions as structured events.

## Main entity

`work_events`

Suggested fields:

- id
- work_session_id
- employee_id
- assignment_id
- event_type
- event_time
- latitude
- longitude
- location_accuracy
- address_text
- payload_json
- created_at

## Event types

- gasfahrt_start
- gasfahrt_stop
- dienstbeginn
- arbeit_stop
- dienstfahrt_start
- dienstfahrt_stop
- break_start
- break_stop
- manual_correction

## Task fields

Work task data can be stored on the work session or in event payload:

- date
- leistungsart
- leistungsart_custom
- referenznummer
- zugnummer
- einsatzort
- planned_start
- planned_stop
- actual_start
- actual_stop
- bemerkung

## Validation rules

### Stop rule

If actual duration is greater than planned duration, `bemerkung` is required before stop can be submitted.

### Location rule

If location permission is available, each start and stop event should store coordinates.

If location is not available, the system should still allow saving the event, but mark it as missing location.

## Google Maps

The database stores coordinates. Google Maps should be used only for display in the frontend.
