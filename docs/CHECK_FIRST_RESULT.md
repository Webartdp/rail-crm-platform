# Check First Result

## What is ready to view

The first visual frontend prototype is ready in the `foundation-scaffold` branch.

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

There is also a simple interactive demo page for checking the button flow.

## How to run frontend locally

```bash
git clone https://github.com/Webartdp/rail-crm-platform.git
cd rail-crm-platform
git checkout foundation-scaffold
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

## What to check on screen

- employee action buttons
- German field names
- required customer fields
- visual order of the workflow
- mobile-friendly layout
- demo button flow

## Important

This is the first frontend prototype, not the finished CRM.

Main screen buttons do not yet save real data. Backend API stubs were added and will be connected in the next stage.
