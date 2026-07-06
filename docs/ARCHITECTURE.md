# Architecture

## Product type

Rail CRM Platform is a standalone business application. It should not depend on MODX.

The old CRM project can be used as a reference for business flows, UI ideas and terminology only.

## High-level architecture

```text
Next.js frontend  ->  Laravel API  ->  PostgreSQL
                         |
                         -> Redis queues/cache
                         -> Mail / notifications
                         -> PDF generation
```

## Backend

Laravel should be used as the main API layer.

Core backend responsibilities:

- authentication
- authorization
- business rules
- REST API
- validation
- background jobs
- notifications
- audit logging
- document generation

## Frontend

Next.js should be used for the web interface.

Main frontend areas:

- admin dashboard
- coordinator workspace
- employee cabinet
- client/object management
- assignments
- time tracking
- approvals
- documents
- billing

## Database

PostgreSQL is the main database.

Redis is used for cache, queues and temporary operational state.

## Mobile

Mobile apps should not be started first.

The first stage is a stable API and mobile-first web interface. A separate mobile app can be added later.
