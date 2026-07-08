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

Show employee:

```text
GET /api/v1/employee-profiles/{id}
```

Update employee:

```text
PUT /api/v1/employee-profiles/{id}
```

## Fields

- first_name
- last_name
- phone
- standard_hourly_rate
- travel_hourly_rate
- night_coefficient
- sunday_coefficient
- holiday_coefficient
- home_location
- is_active

## Defaults

- standard_hourly_rate: 0
- travel_hourly_rate: 0
- night_coefficient: 1
- sunday_coefficient: 1
- holiday_coefficient: 1

## Rule

Rates belong to employee profile.

Work orders must not be the source of hourly rate.

All tariff fields should be editable in the admin / employee profile UI.
