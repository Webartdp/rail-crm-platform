# Business Rules

## General rule

The new product is not a MODX extension. Old CRM logic is a source of requirements only.

## Employee tariff rule

Tariff settings belong to the employee profile.

Assignment should not store the main hourly rate as the source of truth.

Employee tariff fields:

- standard hourly rate
- night coefficient
- Sunday coefficient
- holiday coefficient
- home location

## Time flags

A work session or timesheet day can have calculation flags:

- is night
- is Sunday
- is holiday

These flags affect calculation through employee tariff settings.

## Approval rule

Billing should use only approved time data.

Basic flow:

1. employee confirms time
2. coordinator reviews
3. manager approves
4. approved data can be used for documents and billing

## Audit rule

Important actions must be written to audit log.

Examples:

- login
- role change
- assignment change
- time correction
- approval
- document generation
- signature
- invoice status change
