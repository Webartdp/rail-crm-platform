# MODX to Laravel / Next.js Guide

This guide explains the new architecture for a developer who understands MODX.

## Main idea

In MODX, the website, logic, templates, chunks, snippets and manager interface often live inside one CMS.

In this product, we separate the system into clear layers:

- Laravel backend: business logic and API
- PostgreSQL: database
- Redis: queues and cache
- Next.js frontend: user interface
- Mobile app later: separate client for employees

## MODX comparison

### MODX Resource

Closest idea in the new system:

- database record
- API resource
- frontend page

Example: employee, client, object, assignment.

### MODX Template

Closest idea:

- React / Next.js page layout
- reusable frontend component

### MODX Chunk

Closest idea:

- React component

Example:

- EmployeeStatusCard
- AssignmentTable
- GasfahrtButton
- ApprovalQueue

### MODX Snippet

Closest idea:

- Laravel controller
- service class
- action class

Example:

- StartGasfahrtAction
- StopWorkSessionAction
- ApproveTimesheetAction

### MODX Plugin

Closest idea:

- Laravel event listener
- queue job
- observer

Example:

When timesheet is approved, generate audit log and notify accountant.

### MODX TV field

Closest idea:

- database column
- JSON field
- form field in frontend

### MODX Manager page

Closest idea:

- Next.js admin page
- Laravel API endpoints behind it

## Important difference

MODX often mixes content management and business logic.

This CRM must not do that.

Business rules live in the backend. Frontend only shows forms, buttons and data.

## Example: Gasfahrt

In MODX you might create:

- page
- snippet
- AJAX processor
- custom table

In the new system we create:

- frontend button: Gasfahrt
- API endpoint: POST /api/v1/work-sessions/gasfahrt/start
- Laravel action: StartGasfahrtAction
- database record in work_events
- audit log record

## Example: Stop with Bemerkung rule

Rule:

If actual time is greater than planned time, Bemerkung is required.

This rule must be checked in Laravel backend.

Frontend can also show a warning, but backend is the source of truth.

## How to think about development

Do not ask: where is the MODX chunk?

Ask instead:

1. What data do we store?
2. What action does the user perform?
3. What API endpoint handles it?
4. What backend rule validates it?
5. What frontend screen shows it?

## First learning path

You do not need to learn everything at once.

Learn in this order:

1. Git basics for this repository
2. Laravel routes and controllers
3. Laravel migrations
4. Laravel models
5. API requests and responses
6. Next.js pages and components
7. Forms and validation
8. Roles and permissions

## Safe rule

If you are unsure where logic belongs, put business logic in Laravel, not in the frontend.
