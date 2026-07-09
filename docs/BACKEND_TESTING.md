# Backend Testing

Purpose:

Document the backend automated test setup for CRM auth, roles and core workflow protection.

## Test runner

Configuration:

```text
backend/phpunit.xml
```

Base test class:

```text
backend/tests/TestCase.php
```

Run all backend tests:

```bash
cd backend
php artisan test
```

Run only feature tests:

```bash
cd backend
php artisan test --testsuite=Feature
```

## Test database

The default test config uses SQLite in memory:

```text
DB_CONNECTION=sqlite
DB_DATABASE=:memory:
```

Migrations run through Laravel RefreshDatabase.

## Current feature test files

```text
backend/tests/Feature/AuthAndRoleTest.php
backend/tests/Feature/WorkOrderDocumentTest.php
backend/tests/Feature/FieldWorkflowBillingTest.php
```

## Covered now

Auth and roles:

- register returns Sanctum token
- token can access /auth/me
- logout invalidates Sanctum token
- employee cannot access manager dashboard
- manager can access manager dashboard
- manager cannot create employee tariff profile
- admin can create employee tariff profile

Work orders and documents:

- employee cannot create work order
- manager can create work order
- manager can close work order
- close writes audit log
- employee cannot create document
- manager can create document
- manager can request signature
- employee can sign pending signature
- signed document status is updated

Field workflow and billing:

- wrong workflow order is blocked
- employee can create field workflow event
- manager can list approval queue
- manager can approve interval
- costs include approved intervals
- manager can create invoice draft
- work order becomes invoiced
- employee cannot view costs
- employee cannot create invoice

## Important note

These are backend Feature Tests. They do not replace browser/E2E tests for the Next.js UI.

Recommended later:

- add Playwright UI tests
- add PDF/document upload tests with fake files
- add policy tests for every role/route combination
- add invoice duplicate-prevention tests
