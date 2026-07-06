# API Draft

Base API prefix:

```text
/api/v1
```

## Auth

- POST /auth/login
- POST /auth/logout
- GET /auth/me

## Users and employees

- GET /users
- POST /users
- GET /users/{id}
- PATCH /users/{id}
- GET /employees
- POST /employees
- GET /employees/{id}
- PATCH /employees/{id}

## Clients and objects

- GET /clients
- POST /clients
- GET /clients/{id}
- PATCH /clients/{id}
- GET /objects
- POST /objects
- GET /objects/{id}
- PATCH /objects/{id}

## Assignments

- GET /assignments
- POST /assignments
- GET /assignments/{id}
- PATCH /assignments/{id}
- POST /assignments/{id}/employees

## Work sessions

- GET /work-sessions
- POST /work-sessions/start
- POST /work-sessions/{id}/stop
- POST /work-sessions/{id}/events

## Timesheets

- GET /timesheets
- GET /timesheets/{id}
- POST /timesheets/{id}/confirm
- POST /timesheets/{id}/approve
- POST /timesheets/{id}/reject

## Documents

- GET /documents
- POST /documents
- GET /documents/{id}
- POST /documents/{id}/sign

## Billing

- GET /invoices
- POST /invoices
- PATCH /invoices/{id}
