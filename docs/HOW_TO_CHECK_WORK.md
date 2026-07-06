# How to Check Work

## Current stage

At this stage the project is not a working CRM yet.

Now you can check:

- repository structure
- documentation
- product requirements
- GitHub issues
- pull requests
- backend and frontend preparation files

## What to check now

### 1. Pull Request

Open the active PR and review changed files.

Check that the project direction is correct:

- Laravel backend
- Next.js frontend
- PostgreSQL
- Redis
- field workflow requirements
- employee button states

### 2. Issues

Open GitHub Issues and check if tasks match the product plan.

Important issues:

- Stage 1 foundation
- CRM core entities
- Field operations and time tracking
- Client field workflow
- Employee button states

### 3. Documentation

Read docs in this order:

1. README.md
2. docs/MVP_SCOPE.md
3. docs/CLIENT_FIELD_WORKFLOW.md
4. docs/FIELD_EVENT_MODEL.md
5. docs/EMPLOYEE_BUTTON_STATES.md
6. docs/STAGE_1_IMPLEMENTATION_PLAN.md

## How to check later locally

When backend and frontend skeletons are ready, local check will be:

```bash
docker compose up -d
```

Backend:

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Then open:

```text
http://localhost:3000
```

API will be available at:

```text
http://localhost:8000
```

## What counts as working MVP

The first working MVP should allow:

- login
- employee list
- client list
- object list
- assignment list
- employee field screen
- Gasfahrt
- Gasfahrt beendet
- Dienstbeginn
- Stop
- Start Dienstfahrt
- Stop Dienstfahrt
- timesheet confirmation
- approval queue

## Simple rule

If there is no interface yet, check GitHub PR and documentation.

If there is an interface, check it in browser.

If there is an API, check it through browser, Postman or frontend requests.
