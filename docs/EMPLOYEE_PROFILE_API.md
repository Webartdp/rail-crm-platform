# Employee Profile API

Purpose:

Employee profile stores personal employee data and tariff settings.

## API

List employees:

```text
GET /api/v1/employee-profiles
```

Create employee:

```text
POST /api/v1/employee-profiles
```

## Fields

- first_name
- last_name
- phone
- standard_hourly_rate
- night_coefficient
- sunday_coefficient
- holiday_coefficient
- home_location
- is_active

## Rule

Rates belong to employee profile.

Work orders must not be the source of hourly rate.
