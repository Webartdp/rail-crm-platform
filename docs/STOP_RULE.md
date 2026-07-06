# Stop Rule

Requirement:

Stop is blocked when actual time exceeds planned time and Bemerkung is empty.

MVP frontend:

- Geplanter Start field
- Geplanter Stop field
- current browser time is compared with Geplanter Stop
- Stop is disabled if time is exceeded and Bemerkung is empty

Backend:

- arbeit_stop rejects planned_exceeded=true without Bemerkung

Later:

- planned time must come from selected work order
