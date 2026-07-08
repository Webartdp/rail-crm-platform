# Auth and Roles

Purpose:

MVP authentication and role model for the CRM.

## Table

```text
app_users
```

Fields:

- employee_profile_id
- name
- email
- password_hash
- role
- api_token
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

Login/register returns a token.

Frontend stores it in localStorage and sends it as:

```text
Authorization: Bearer <token>
```

## Current role checks

Only admin can:

- create employee profiles
- update employee profiles and tariff settings

Only manager/admin can:

- create work orders
- close work orders
- create documents
- download/print documents
- create OCR actions
- request signatures
- approve or reject work event intervals
- create invoice drafts
- view manager dashboard

Authenticated users can:

- sign pending document signatures
- reject pending document signatures

## Employee workflow

The demo workflow uses the logged-in user's employee_profile_id as employee_id.

If no logged-in user exists, it falls back to employee #1 for demo compatibility.

## Frontend protected writes

The following helpers send Bearer token:

- employee-profiles create/update
- work-orders create/close
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

## MVP note

This is a lightweight MVP token system. It can be replaced later with Laravel Sanctum middleware or session auth.
