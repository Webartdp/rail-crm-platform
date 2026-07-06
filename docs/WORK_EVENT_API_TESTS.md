# Work Event API Tests

Use these requests only after backend is running and migrations are applied.

Base URL:

```text
http://localhost:8000/api/v1
```

## Gasfahrt

```bash
curl -X POST http://localhost:8000/api/v1/work-events/gasfahrt/start \
  -H "Content-Type: application/json" \
  -d '{"employee_id":1,"assignment_id":1,"latitude":48.137154,"longitude":11.576124}'
```

## Dienstbeginn

```bash
curl -X POST http://localhost:8000/api/v1/work-events/dienstbeginn \
  -H "Content-Type: application/json" \
  -d '{"employee_id":1,"assignment_id":1,"payload":{"date":"2026-07-06","leistungsart":"WTU","referenznummer":"REF-2026-001","zugnummer":"ICE 204","einsatzort":"Gleis 12"}}'
```

## Stop blocked without Bemerkung

This request should return validation error:

```bash
curl -X POST http://localhost:8000/api/v1/work-events/arbeit/stop \
  -H "Content-Type: application/json" \
  -d '{"employee_id":1,"assignment_id":1,"planned_exceeded":true,"bemerkung":""}'
```

## Stop with Bemerkung

```bash
curl -X POST http://localhost:8000/api/v1/work-events/arbeit/stop \
  -H "Content-Type: application/json" \
  -d '{"employee_id":1,"assignment_id":1,"planned_exceeded":true,"bemerkung":"Task took longer than planned."}'
```

## List events

```bash
curl http://localhost:8000/api/v1/work-events
```
