# Work Order API

Confirmed need:

- Referenznummer can be predefined or entered manually
- Einsatzort can be predefined or entered manually
- employee workflow should be connected to an assignment / work order

Implemented:

- table: work_orders
- controller: backend/app/Http/Controllers/Api/V1/WorkOrderController.php
- GET /api/v1/work-orders
- POST /api/v1/work-orders
- frontend helper: frontend/lib/work-orders.ts
- assignment list page loads work orders from API
- new work order page: /work-orders/new
- employee workflow demo can select Auftrag and fill fields from it

Manual entry remains possible:

- Referenznummer can be edited
- Zugnummer can be edited
- Einsatzort can be edited
- Leistungsart can be selected or entered manually

Next step:

- connect real employee authentication and employee-specific assignment lists
