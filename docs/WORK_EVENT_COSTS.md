# Work Event Costs

Purpose:

Calculate work cost from completed work event pairs and employee tariff settings.

## API

```text
GET /api/v1/work-event-costs
```

## Calculation source

Duration source:

- dienstbeginn
- arbeit_stop

Rate source:

- employee_profiles.standard_hourly_rate

Coefficient source:

- employee_profiles.night_coefficient
- employee_profiles.sunday_coefficient
- employee_profiles.holiday_coefficient

## Current MVP rule

Cost is calculated only for completed work task pairs:

```text
dienstbeginn -> arbeit_stop
```

Amount:

```text
hours * standard_hourly_rate * coefficient
```

## Flags

Coefficient can be selected from event payload flags:

- is_night
- is_sunday
- is_holiday

Priority:

1. holiday
2. sunday
3. night
4. standard

## Not included yet

- travel cost rules for Gasfahrt
- travel cost rules for Dienstfahrt
- invoice generation
- approval requirement before billing
