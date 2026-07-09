# Customer Recommendations Status

Purpose:

Track what has already been implemented from the customer/owner recommendations and what remains for production readiness.

## Implemented MVP

### Employee field workflow

Done:

- Gasfahrt start
- Gasfahrt stop
- Dienstbeginn
- Arbeit stop
- Dienstfahrt start
- Dienstfahrt stop
- backend-driven next allowed action
- wrong order protection
- location fields for events
- required Dienstbeginn fields
- Bemerkung required when planned time is exceeded

### Employee-specific tariffs

Done:

- tariff belongs to employee profile
- standard hourly rate
- travel hourly rate
- night coefficient
- sunday coefficient
- holiday coefficient
- home location
- travel rate defaults to 0
- admin edit screens for tariffs

### Time/cost/approval flow

Done:

- event duration calculation
- work/travel duration pairing
- cost calculation from employee tariffs
- tariff flags: night/sunday/holiday
- approval queue before billing
- only approved intervals enter costs
- invoice draft generation from approved uninvoiced intervals

### Work orders / Auftrag

Done:

- create work order
- assign employee_id
- planned start/end
- reference number
- Leistungsart
- Zugnummer
- Einsatzort
- status workflow basics
- close work order endpoint
- close button in assignments and document print page

### Roles/auth

Done:

- employee / manager / admin roles
- login/register/me/logout
- Sanctum personal access tokens
- route-level role middleware
- frontend route guards
- role-aware navigation

### Documents / Belege

Done:

- document metadata
- real file upload
- PDF/JPG/PNG/WebP support
- protected download
- inline preview for PDF/images
- OCR status fields
- manual/integration OCR text save
- document signatures
- typed signature
- canvas signature
- print/export page

### Manager overview

Done:

- manager dashboard
- pending approvals count/list
- approved but not invoiced count/list
- documents needing signature count/list
- open work orders count/list

### Audit

Done:

- work event audit
- work order created/closed audit
- approval audit
- invoice audit
- document upload/OCR/signature audit

## Partially implemented

### Online-Planer style modules

Partially done:

- Personal/Stempeluhr basics
- Dokumente/Belege basics
- Buchhaltung/Rechnung MVP
- Reporting/manager dashboard MVP
- Admin/roles MVP

Not fully done yet:

- full railway module set
- full station/track infrastructure
- full vehicle/loco management
- full DB/Ril brake calculation
- calendar/shift planning depth
- marketplace
- full mobile offline app

### OCR

Partially done:

- fields and API workflow are ready
- text can be saved manually/API

Not done yet:

- automatic OCR extraction service
- background OCR queue
- OCR confidence/field extraction

### Signatures

Partially done:

- typed signature
- canvas signature
- signature status
- print display

Not done yet:

- legally hardened e-signature flow
- signer identity verification
- signed PDF stamping

### Auth

Partially done:

- Sanctum tokens
- role middleware
- frontend guards

Not done yet:

- automated feature tests for all roles
- rate limiting / lockout
- password reset
- invitation-based user creation

## Not implemented yet / next production steps

Recommended next steps:

1. Laravel feature tests for role access and main workflows.
2. Replace remaining duplicate controller role checks with tested policies where useful.
3. Real OCR integration.
4. Signed PDF generation/stamping.
5. Work order edit page.
6. Better employee assignment model instead of simple work_orders.employee_id.
7. Mobile/offline mode for field workers.
8. Calendar/shift planning module.
9. More complete reporting/export.
10. Production hardening: logging, validation, rate limiting, backups, deployment docs.

## Current answer

Yes: the main customer recommendations are implemented as MVP.

No: it is not yet a full production clone of Online-Planer or a fully certified document/signature/OCR system.
