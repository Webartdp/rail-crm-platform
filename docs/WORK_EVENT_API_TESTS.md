# Work Event API Tests

Use these requests only after backend is running and migrations are applied.

Base URL:

```text
http://localhost:8000/api/v1
```

## Create employee profile

```bash
curl -X POST http://localhost:8000/api/v1/employee-profiles \
  -H "Content-Type: application/json" \
  -d '{"first_name":"Max","last_name":"Muller","phone":"+49 000 000000","standard_hourly_rate":28,"travel_hourly_rate":0,"night_coefficient":1.25,"sunday_coefficient":1.5,"holiday_coefficient":2,"home_location":"Dresden"}'
```

## Update employee travel rate

```bash
curl -X PUT http://localhost:8000/api/v1/employee-profiles/1 \
  -H "Content-Type: application/json" \
  -d '{"first_name":"Max","last_name":"Muller","phone":"+49 000 000000","standard_hourly_rate":28,"travel_hourly_rate":15,"night_coefficient":1.25,"sunday_coefficient":1.5,"holiday_coefficient":2,"home_location":"Dresden"}'
```

## List employee profiles

```bash
curl http://localhost:8000/api/v1/employee-profiles
```

## Create work order for employee 1

```bash
curl -X POST http://localhost:8000/api/v1/work-orders \
  -H "Content-Type: application/json" \
  -d '{"employee_id":1,"title":"WTU / ICE 204 / Gleis 12","reference_number":"REF-2026-001","leistungsart":"WTU","zugnummer":"ICE 204","einsatzort":"Gleis 12","planned_start_at":"2026-07-06T07:30","planned_end_at":"2026-07-06T15:30"}'
```

## List employee 1 work orders

```bash
curl "http://localhost:8000/api/v1/work-orders?employee_id=1"
```

## Field state

```bash
curl "http://localhost:8000/api/v1/employee/field-state?employee_id=1&assignment_id=1"
```

## Wrong action order test

If no event exists yet, this should return HTTP 409 because Gasfahrt must be first:

```bash
curl -i -X POST http://localhost:8000/api/v1/work-events/dienstbeginn \
  -H "Content-Type: application/json" \
  -d '{"employee_id":1,"assignment_id":1,"payload":{"date":"2026-07-06","leistungsart":"WTU","referenznummer":"REF-2026-001","zugnummer":"ICE 204","einsatzort":"Gleis 12"}}'
```

## Gasfahrt

```bash
curl -X POST http://localhost:8000/api/v1/work-events/gasfahrt/start \
  -H "Content-Type: application/json" \
  -d '{"employee_id":1,"assignment_id":1,"latitude":48.137154,"longitude":11.576124}'
```

## Dienstbeginn with tariff flags

```bash
curl -X POST http://localhost:8000/api/v1/work-events/dienstbeginn \
  -H "Content-Type: application/json" \
  -d '{"employee_id":1,"assignment_id":1,"payload":{"date":"2026-07-06","leistungsart":"WTU","referenznummer":"REF-2026-001","zugnummer":"ICE 204","einsatzort":"Gleis 12","is_night":true,"is_sunday":false,"is_holiday":false}}'
```

## Stop blocked without Bemerkung

This request should return validation error:

```bash
curl -X POST http://localhost:8000/api/v1/work-events/arbeit/stop \
  -H "Content-Type: application/json" \
  -d '{"employee_id":1,"assignment_id":1,"planned_exceeded":true,"bemerkung":""}'
```

## Stop with Bemerkung and tariff flags

```bash
curl -X POST http://localhost:8000/api/v1/work-events/arbeit/stop \
  -H "Content-Type: application/json" \
  -d '{"employee_id":1,"assignment_id":1,"planned_exceeded":true,"bemerkung":"Task took longer than planned.","payload":{"is_night":true,"is_sunday":false,"is_holiday":false}}'
```

## List approvals

This creates missing pending approval rows and returns stable approval IDs:

```bash
curl http://localhost:8000/api/v1/work-event-approvals
```

## Approve interval by ID

Use the `id` from the approval list response:

```bash
curl -X POST http://localhost:8000/api/v1/work-event-approvals/1/approve \
  -H "Content-Type: application/json" \
  -d '{"approved_by":1,"comment":"Approved."}'
```

## List events

```bash
curl http://localhost:8000/api/v1/work-events
```

## Durations

```bash
curl http://localhost:8000/api/v1/work-event-durations
```

## Costs

Only approved intervals are included:

```bash
curl http://localhost:8000/api/v1/work-event-costs
```

## Create invoice draft

Only approved and not-yet-invoiced intervals are included:

```bash
curl -X POST http://localhost:8000/api/v1/invoices
```

## List invoices

```bash
curl http://localhost:8000/api/v1/invoices
```

## Audit

```bash
curl http://localhost:8000/api/v1/audit
```
