# Database Stage 1 Tables

## employee_profiles

Purpose: employee business profile and tariff settings.

Important fields:

- user_id
- first_name
- last_name
- phone
- standard_hourly_rate
- night_coefficient
- sunday_coefficient
- holiday_coefficient
- home_location
- is_active

## assignments

Purpose: planned work task for a client object.

Important fields:

- client_id
- object_id
- title
- reference_number
- train_number
- work_location
- default_leistungsart
- planned_start_at
- planned_end_at
- status

## work_sessions

Purpose: employee work process connected to assignment.

Important fields:

- employee_id
- assignment_id
- started_at
- stopped_at
- status
- leistungsart
- reference_number
- train_number
- work_location
- bemerkung
- planned_exceeded

## work_events

Purpose: every employee button action.

Important fields:

- employee_id
- assignment_id
- event_type
- event_time
- latitude
- longitude
- location_accuracy
- address_text
- payload

## Rule

Employee tariff values belong to employee_profiles, not to assignments.
