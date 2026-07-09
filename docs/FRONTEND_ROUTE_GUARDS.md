# Frontend Route Guards

Purpose:

Hide manager/admin UI from ordinary employees and show clear access messages on direct URL access.

## Component

```text
frontend/app/components/RoleGuard.tsx
```

The guard checks the current user through:

```text
GET /api/v1/auth/me
```

using the token stored in localStorage.

If the user is not logged in, it shows a login link.

If the user has the wrong role, it shows an access denied panel.

## Role-aware navigation

```text
frontend/app/components/MainNav.tsx
```

Navigation now loads the current user and only shows links allowed for that role.

It also shows a logout button when the user is logged in.

## Guarded pages

Manager/admin:

- /manager-dashboard
- /approvals
- /billing
- /assignments
- /documents
- /documents/{id}/print
- /work-orders/new
- /work-events
- /durations
- /costs

Admin only:

- /employees
- /employees/new
- /employees/{id}/edit

Public/employee-compatible:

- /
- /login
- /employee
- /demo

## Important note

Frontend route guards are a UX layer only.

Security still lives on the backend:

- approval API checks manager/admin
- invoice API checks manager/admin
- document upload/download/OCR/print checks manager/admin
- employee tariff writes check admin
- work order creation/close checks manager/admin
- costs/durations reads check manager/admin

Do not rely on frontend-only checks for real authorization.
