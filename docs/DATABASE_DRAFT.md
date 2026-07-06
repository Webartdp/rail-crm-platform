# Database Draft

This is the first draft of the database model. It will be refined before implementation.

## Core tables

- users
- employee_profiles
- roles
- permissions
- companies
- clients
- client_contacts
- objects
- object_locations
- assignments
- assignment_employees
- work_sessions
- work_events
- timesheets
- timesheet_days
- approvals
- documents
- document_signatures
- invoices
- payments
- notifications
- audit_logs

## Important relations

- user has one employee profile
- employee can have many assignments
- assignment belongs to client and object
- work session belongs to employee and assignment
- work session has many work events
- timesheet is generated from work sessions
- document can belong to assignment, client, object or invoice
- audit log tracks important user actions

## Work events

Possible event types:

- travel_to_work
- business_trip
- work_start
- work_stop
- break_start
- break_stop
- manual_correction

## Approval flow

Basic approval chain:

1. employee submits or confirms time
2. coordinator reviews
3. manager approves
4. billing can use approved data

## Billing flow

Only approved work data should be used for invoice generation.
