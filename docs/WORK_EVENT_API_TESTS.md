# Work Event API Tests

Use these requests only after backend is running and migrations are applied.

Base URL:

```text
http://localhost:8000/api/v1
```

## Register admin user

```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin User","email":"admin@example.com","password":"password","role":"admin","employee_profile_id":1}'
```

Copy token from the response and use it below:

```bash
TOKEN="paste-token-here"
```

## Login

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'
```

## Current user

```bash
curl http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

## Create employee profile

Requires admin token:

```bash
curl -X POST http://localhost:8000/api/v1/employee-profiles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"first_name":"Max","last_name":"Muller","phone":"+49 000 000000","standard_hourly_rate":28,"travel_hourly_rate":0,"night_coefficient":1.25,"sunday_coefficient":1.5,"holiday_coefficient":2,"home_location":"Dresden"}'
```

## Update employee travel rate

Requires admin token:

```bash
curl -X PUT http://localhost:8000/api/v1/employee-profiles/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"first_name":"Max","last_name":"Muller","phone":"+49 000 000000","standard_hourly_rate":28,"travel_hourly_rate":15,"night_coefficient":1.25,"sunday_coefficient":1.5,"holiday_coefficient":2,"home_location":"Dresden"}'
```

## List employee profiles

```bash
curl http://localhost:8000/api/v1/employee-profiles
```

## Create work order for employee 1

Requires manager/admin token:

```bash
curl -X POST http://localhost:8000/api/v1/work-orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
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

Use the `id` from the approval list response. Requires manager/admin token:

```bash
curl -X POST http://localhost:8000/api/v1/work-event-approvals/1/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"comment":"Approved."}'
```

## Create document metadata

Requires manager/admin token:

```bash
curl -X POST http://localhost:8000/api/v1/documents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Report REF-2026-001","type":"report","status":"draft","work_order_id":1}'
```

## Upload document file

Requires manager/admin token. Replace `/path/to/report.pdf` with a local PDF/JPG/PNG/WebP file.

```bash
curl -X POST http://localhost:8000/api/v1/documents \
  -H "Authorization: Bearer $TOKEN" \
  -F "title=Uploaded Report REF-2026-001" \
  -F "type=report" \
  -F "work_order_id=1" \
  -F "file=@/path/to/report.pdf"
```

## Download document file

Requires manager/admin token. Use document id from the upload response.

```bash
curl -L http://localhost:8000/api/v1/documents/1/download \
  -H "Authorization: Bearer $TOKEN" \
  -o downloaded-document.pdf
```

## Document print data

Requires manager/admin token. Frontend page is `/documents/1/print`.

```bash
curl http://localhost:8000/api/v1/documents/1/print-data \
  -H "Authorization: Bearer $TOKEN"
```

## Mark document OCR pending

Requires manager/admin token.

```bash
curl -X POST http://localhost:8000/api/v1/documents/1/ocr/start \
  -H "Authorization: Bearer $TOKEN"
```

## Save OCR text

Requires manager/admin token.

```bash
curl -X POST http://localhost:8000/api/v1/documents/1/ocr/text \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"extracted_text":"Example extracted OCR text from the document."}'
```

## List document signatures

```bash
curl http://localhost:8000/api/v1/documents/1/signatures
```

## Request typed document signature

Requires manager/admin token.

```bash
curl -X POST http://localhost:8000/api/v1/documents/1/signatures \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"signer_name":"Max Muller","signer_email":"max@example.com","signature_type":"typed","comment":"Please sign this document."}'
```

## Request canvas document signature

Requires manager/admin token.

```bash
curl -X POST http://localhost:8000/api/v1/documents/1/signatures \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"signer_name":"Max Muller","signer_email":"max@example.com","signature_type":"canvas","comment":"Please draw and sign this document."}'
```

## Sign document with typed signature

Requires authenticated user token. Use signature id from the request/list response.

```bash
curl -X POST http://localhost:8000/api/v1/documents/1/signatures/1/sign \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"signature_type":"typed","signature_data":"Signed by Max Muller"}'
```

## Sign document with canvas signature

Requires authenticated user token. In the browser this value is created by canvas.toDataURL('image/png').

```bash
curl -X POST http://localhost:8000/api/v1/documents/1/signatures/1/sign \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"signature_type":"canvas","signature_data":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB"}'
```

## Reject document signature

Requires authenticated user token.

```bash
curl -X POST http://localhost:8000/api/v1/documents/1/signatures/1/reject \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"comment":"Rejected from API test."}'
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

Only approved and not-yet-invoiced intervals are included. Requires manager/admin token:

```bash
curl -X POST http://localhost:8000/api/v1/invoices \
  -H "Authorization: Bearer $TOKEN"
```

## List invoices

```bash
curl http://localhost:8000/api/v1/invoices
```

## Audit

```bash
curl http://localhost:8000/api/v1/audit
```
