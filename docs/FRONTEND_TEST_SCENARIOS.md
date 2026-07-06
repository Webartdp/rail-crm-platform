# Frontend Test Scenarios

## Scenario 1. Normal employee flow

Open:

```text
http://localhost:3000/demo
```

Expected flow:

1. Gasfahrt
2. Gasfahrt beendet
3. Dienstbeginn
4. Stop
5. Start Dienstfahrt
6. Stop Dienstfahrt

Each click should add an item to the log.

## Scenario 2. Stop blocked without Bemerkung

Steps:

1. Click Gasfahrt.
2. Click Gasfahrt beendet.
3. Click Dienstbeginn.
4. Set "Geplante Zeit überschritten?" to "Ja".
5. Stop should be blocked.
6. Fill Bemerkung.
7. Stop should become available.

## Scenario 3. Stop without exceeded time

Steps:

1. Click Gasfahrt.
2. Click Gasfahrt beendet.
3. Click Dienstbeginn.
4. Keep "Geplante Zeit überschritten?" as "Nein".
5. Stop should be available.

## Rule

The frontend can help the user, but the same validation must also exist in the backend API.
