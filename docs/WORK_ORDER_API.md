# Work Order API

Confirmed need:

- Referenznummer can be predefined or entered manually
- Einsatzort can be predefined or entered manually
- employee workflow should be connected to an assignment / work order

Implemented base:

- controller: backend/app/Http/Controllers/Api/V1/WorkOrderController.php
- table: work_orders

Required route:

- GET /api/v1/work-orders

Next step:

- connect this route in routes/api.php
- load work orders in the employee workflow screen
