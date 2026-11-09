# Rail CRM — mobile app for field staff

Expo (SDK 58) app for employees. It uses the same API as the website
(`src/config.ts` → `https://rlci.ridnovir.in.ua/api/api/v1`). Managers and
administrators work on the website.

## Features

- **Arbeit / Работа:** today's and upcoming work orders grouped by day, the
  next button (Gasfahrt → Dienstbeginn → Stop → Dienstfahrt) with GPS,
  Leistungsart, Bemerkung (required when the planned time is exceeded),
  planned fields from the administrator, route to the work location.
- **Offline:** presses without a connection are stored on the phone with the
  real time and sent in order when the connection is back (the server accepts
  them up to 72 h later). The last loaded orders open without a connection.
- **Zeit / Время:** timesheet for any period (default: this month) — planned vs.
  actual time, night zones, Sunday/holiday, status. Corrections are sent to the
  administrator for approval.
- **Profil / Профиль:** language DE/RU (also saved on the server), change
  password, offline queue, logout.

## Test on a phone (Expo Go)

```bash
cd mobile/employee-app
npm install
npx expo start
```

Scan the QR code with the camera (iPhone) or with Expo Go (Android). Phone and
computer must be in the same network, otherwise use `npx expo start --tunnel`.

Use an **employee** account (an account linked to an employee profile).

## Store builds (later)

Builds for the App Store / Google Play are made with EAS
(`npx eas-cli build`). Before the first store build, set the final bundle id
in `app.json` (`ios.bundleIdentifier`, `android.package`) — it cannot be
changed after publishing.
