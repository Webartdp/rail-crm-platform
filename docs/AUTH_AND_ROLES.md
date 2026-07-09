# Auth and Roles

Purpose:

Authentication and role model for the CRM.

## Tables

CRM users:

```text
app_users
```

Sanctum tokens:

```text
personal_access_tokens
```

## User fields

- employee_profile_id
- name
- email
- password_hash
- role
- api_token legacy fallback
- is_active

## Roles

- employee
- manager
- admin

## API

Register:

```text
POST /api/v1/auth/register
```

Login:

```text
POST /api/v1/auth/login
```

Current user:

```text
GET /api/v1/auth/me
```

Logout:

```text
POST /api/v1/auth/logout
```

## Token

Login/register returns a Sanctum token:

```json
{
  "token_type": "sanctum",
  "token": "..."
}
```

Frontend stores it in localStorage and sends it as:

```text
Authorization: Bearer <token>
```

## Backend route-level role checks

Most protected API routes now use route middleware:

```text
role:employee,manager,admin
role:manager,admin
role:admin
```

Only admin can:

- create employee profiles
- update employee profiles and tariff settings
- view employee tariff admin pages

Only manager/admin can:

- create work orders
- close work orders
- view manager dashboard
- view approvals
- approve or reject work event intervals
- view durations/costs
- create invoice drafts
- create documents
- download/print documents
- create OCR actions
- request signatures
- view audit

Employee/manager/admin can:

- send field workflow button events
- sign pending document signatures
- reject pending document signatures

## Employee workflow

The demo workflow uses the logged-in user's employee_profile_id as employee_id.

If no logged-in user exists, it falls back to employee #1 for demo compatibility, but protected API writes now require a token.

## Frontend protected writes

The following helpers send Bearer token:

- employee-profiles create/update
- work-orders create/close
- work-events button actions
- durations/costs reads
- documents create/upload/download/print/OCR
- document signatures request/sign/reject
- approvals approve/reject
- invoices create

## Frontend route guards

Frontend route guards are documented in:

```text
docs/FRONTEND_ROUTE_GUARDS.md
```

They hide manager/admin pages from ordinary employees and show access denied panels for direct URLs.

## Sanctum details

Sanctum migration details are documented in:

```text
docs/SANCTUM_AUTH.md
```

## MVP note

The legacy `app_users.api_token` fallback still exists temporarily for development migration compatibility. New login/register responses use Sanctum tokens.
