# Check First Result

## What is ready to view

The first visual frontend prototype is ready in the `main` branch.

It shows the employee field screen with:

- Gasfahrt
- Gasfahrt beendet
- Dienstbeginn
- Stop
- Start Dienstfahrt
- Stop Dienstfahrt
- Leistungsart
- Referenznummer
- Zugnummer
- Einsatzort
- Bemerkung
- timeline
- map placeholder

There is also an interactive demo page for checking the button flow and Stop validation rule.

## How to run frontend locally

```bash
git pull
cd frontend
npm install
npm run dev
```

Open main prototype:

```text
http://localhost:3000
```

Open interactive button demo:

```text
http://localhost:3000/demo
```

## What to check on /demo

1. Click through Gasfahrt, Gasfahrt beendet and Dienstbeginn.
2. When the next action is Stop, set "Geplante Zeit überschritten?" to "Ja".
3. Stop should be blocked until Bemerkung is filled.
4. Fill Bemerkung.
5. Continue the flow.

## Important

This is the first frontend prototype, not the finished CRM.

Main screen buttons do not yet save real data. Backend API stubs were added and will be connected in the next stage.
