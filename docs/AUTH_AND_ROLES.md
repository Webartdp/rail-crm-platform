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

Only manager/admin can:

- approve or reject work event intervals
- create invoice drafts

## Employee workflow

The demo workflow uses the logged-in user's employee_profile_id as employee_id.

If no logged-in user exists, it falls back to employee #1 for demo compatibility.

## MVP note

This is a lightweight MVP token system. It can be replaced later with Laravel Sanctum middleware or session auth.
