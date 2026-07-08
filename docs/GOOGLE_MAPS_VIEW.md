# Google Maps View

Purpose:

Show stored workflow coordinates inside the CRM.

## Page

```text
/maps
```

## Source

Coordinates come from work_events:

- latitude
- longitude
- event_type
- event_time

## UI

The maps page shows:

- embedded Google Maps iframe for the selected event
- event list
- Show map button
- external Google Maps link

## Note

Browser geolocation must be allowed on the employee workflow page. Without permission, no coordinates are stored.
