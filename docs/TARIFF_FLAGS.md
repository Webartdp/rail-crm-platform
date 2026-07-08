# Tariff Flags

Purpose:

Timesheet/work event payload can mark a work interval as night, Sunday or holiday.

## Fields

- is_night
- is_sunday
- is_holiday

## UI

The demo workflow form contains checkboxes:

- Nacht
- Sonntag
- Feiertag

These flags are sent in the work event payload.

## Cost calculation

Work cost uses employee profile coefficients:

- employee_profiles.night_coefficient
- employee_profiles.sunday_coefficient
- employee_profiles.holiday_coefficient

Priority:

1. is_holiday
2. is_sunday
3. is_night
4. standard coefficient 1.0

## Current MVP note

Flags are applied to completed work intervals. Travel intervals currently use travel_hourly_rate without extra coefficient.
