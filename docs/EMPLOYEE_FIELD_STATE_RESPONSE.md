# Employee Field State Response

Endpoint:

GET /api/v1/employee/field-state

Purpose:

Return the current employee workflow state and the next allowed actions.

Response fields:

- current_state
- allowed_actions
- required_fields
- employee
- assignment

Employee fields:

- id
- name
- status

Assignment fields:

- id
- date
- leistungsart
- referenznummer
- zugnummer
- einsatzort
- planned_start
- planned_stop
- leistungsart_options

Rule:

Frontend must render employee buttons from allowed_actions, not from hardcoded assumptions.
