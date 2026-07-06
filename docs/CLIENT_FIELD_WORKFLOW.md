# Client Field Workflow

This document records the requested employee field workflow.

## 1. Gasfahrt

When an employee leaves home, they press:

```text
Gasfahrt
```

The system starts counting travel time to the work location.

Required data:

- employee
- assignment
- start time
- start location
- event type: gasfahrt_start

## 2. Gasfahrt beendet

When the employee arrives at the work location, they press:

```text
Gasfahrt beendet
```

The system stops travel time counting and stores the arrival location.

Required data:

- end time
- end location
- total travel duration
- Google Maps position
- event type: gasfahrt_stop

## 3. Dienstbeginn

After arrival, the employee presses:

```text
Dienstbeginn
```

The system starts the work task and stores the current location.

Required fields:

- date
- Leistungsart
- Referenznummer
- Zugnummer
- Einsatzort
- Start time
- start location
- Bemerkung

## Leistungsart values

Default list:

- WTU
- WSU
- E-WU
- Rb
- Azf
- RID-Kontrolle
- Zugbeschtreifung
- empty / custom value

If the list value is empty, the employee can enter a custom Leistungsart manually.

## 4. Stop

When the task is finished, the employee presses:

```text
Stop
```

The system stores:

- stop time
- stop location
- task duration
- Google Maps position

## Overplanned time rule

If actual task time is greater than planned task time, the Stop button must not be active until the employee fills the Bemerkung field.

## 5. Dienstfahrt

For travel to the next work location, the employee presses:

```text
Start Dienstfahrt
```

The system starts counting business travel time.

Required data:

- start time
- start location
- source task or source assignment
- event type: dienstfahrt_start

## 6. Stop Dienstfahrt

When the employee arrives at the next location, they press:

```text
Stop Dienstfahrt
```

The system stores:

- end time
- end location
- travel duration
- Google Maps position
- event type: dienstfahrt_stop

## Implementation notes

This workflow should be implemented as work session events.

Suggested event types:

- gasfahrt_start
- gasfahrt_stop
- dienstbeginn
- arbeit_stop
- dienstfahrt_start
- dienstfahrt_stop

All important events should be written to the audit log.
