# Work Event Costs

Purpose:

Calculate work and travel cost from completed event pairs and employee tariff settings.

## API

```text
GET /api/v1/work-event-costs
```

## Calculation source

Work duration:

```text
dienstbeginn -> arbeit_stop
```

Travel duration:

```text
gasfahrt_start -> gasfahrt_stop
dienstfahrt_start -> dienstfahrt_stop
```

Work rate source:

```text
employee_profiles.standard_hourly_rate
```

Travel rate source:

```text
employee_profiles.travel_hourly_rate
```

Default travel rate:

```text
0
```

This means travel is included in the cost calculation, but no money is charged for travel until travel_hourly_rate is changed in the employee profile.

## Amount

Work:

```text
hours * standard_hourly_rate * coefficient
```

Travel:

```text
hours * travel_hourly_rate
```

## Coefficients

Work coefficient can be selected from event payload flags:

- is_night
- is_sunday
- is_holiday

Priority:

1. holiday
2. sunday
3. night
4. standard

## Admin rule

All employee tariff settings must be editable from employee profile/admin UI:

- work hourly rate
- travel hourly rate
- night coefficient
- sunday coefficient
- holiday coefficient

## Not included yet

- invoice generation
- approval requirement before billing
