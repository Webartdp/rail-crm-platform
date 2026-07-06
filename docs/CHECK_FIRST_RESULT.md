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

## How to run frontend locally

```bash
git clone https://github.com/Webartdp/rail-crm-platform.git
cd rail-crm-platform
git checkout foundation-scaffold
cd frontend
npm install
npm run dev
```

Open in browser:

```text
http://localhost:3000
```

## What to check on screen

- employee action buttons
- German field names
- required customer fields
- visual order of the workflow
- mobile-friendly layout

## Important

This is the first frontend prototype, not the finished CRM.

Buttons do not yet save real data. Backend API stubs were added and will be connected in the next stage.
