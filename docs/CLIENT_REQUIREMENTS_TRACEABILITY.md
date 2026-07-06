# Client Requirements Traceability

This file maps only confirmed client requirements to implementation.

## Gasfahrt

Requirement:

- employee presses Gasfahrt when leaving home
- travel time starts
- start location is stored

Current implementation:

- frontend demo button: Gasfahrt
- API event: gasfahrt_start
- backend stores event in work_events
- browser geolocation is requested when available

Status:

- implemented as MVP flow
- exact travel duration calculation is not implemented yet

## Gasfahrt beendet

Requirement:

- employee presses Gasfahrt beendet on arrival
- travel time stops
- arrival location is stored
- Google Maps position should be available

Current implementation:

- frontend demo button: Gasfahrt beendet
- API event: gasfahrt_stop
- backend stores event in work_events
- coordinates are stored when browser provides them

Status:

- implemented as MVP flow
- Google Maps visual display is not implemented yet
- duration calculation is not implemented yet

## Dienstbeginn

Requirement fields:

- date
- Leistungsart
- Referenznummer
- Zugnummer
- Einsatzort
- start time
- start location
- Bemerkung field

Current implementation:

- frontend demo contains these fields
- Leistungsart list contains WTU, WSU, E-WU, Rb, Azf, RID-Kontrolle, Zugbeschtreifung and custom value
- backend validates required Dienstbeginn fields
- backend stores dienstbeginn event in work_events

Status:

- implemented as MVP flow

## Stop

Requirement:

- employee presses Stop when task ends
- stop time is stored
- stop location is stored
- task duration should be available
- if actual time exceeds planned time, Stop is blocked without Bemerkung

Current implementation:

- frontend blocks Stop when planned time is exceeded and Bemerkung is empty
- backend also rejects arbeit_stop when planned_exceeded is true and Bemerkung is empty
- backend stores arbeit_stop event in work_events

Status:

- Stop validation is implemented
- duration calculation is not implemented yet

## Start Dienstfahrt

Requirement:

- employee presses Start Dienstfahrt when travelling to next work location
- travel time starts
- start location is stored

Current implementation:

- frontend demo button: Start Dienstfahrt
- API event: dienstfahrt_start
- backend stores event in work_events

Status:

- implemented as MVP flow
- duration calculation is not implemented yet

## Stop Dienstfahrt

Requirement:

- employee presses Stop Dienstfahrt on arrival at next work location
- travel time stops
- end location is stored
- Google Maps position should be available

Current implementation:

- frontend demo button: Stop Dienstfahrt
- API event: dienstfahrt_stop
- backend stores event in work_events

Status:

- implemented as MVP flow
- Google Maps visual display is not implemented yet
- duration calculation is not implemented yet

## Not implemented yet

- exact duration calculation between paired start and stop events
- Google Maps visual rendering
- real employee authentication
- real assignment selection
- audit log records
