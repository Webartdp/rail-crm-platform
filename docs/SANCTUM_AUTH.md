# Sanctum Auth

Purpose:

Move CRM auth from MVP manual api_token to Laravel Sanctum personal access tokens plus route-level role middleware.

## Package

Sanctum is installed through Composer:

```text
laravel/sanctum
```

## User model

```text
backend/app/Models/AppUser.php
```

The model:

- uses Laravel Sanctum HasApiTokens
- maps to the existing app_users table
- keeps password_hash as the auth password
- keeps role and employee_profile_id fields

## Token table

```text
personal_access_tokens
```

Migration:

```text
backend/database/migrations/2026_07_06_000019_create_personal_access_tokens_table.php
```

## Auth config

```text
backend/config/auth.php
```

The API guard uses:

```text
sanctum
```

The provider uses:

```text
App\Models\AppUser
```

## Login/register

Register and login now return Sanctum plain text tokens:

```json
{
  "token_type": "sanctum",
  "token": "..."
}
```

Frontend still sends:

```text
Authorization: Bearer <token>
```

## Current user resolver

```text
backend/app/Support/CurrentUser.php
```

Resolution order:

1. Laravel request user if available
2. Sanctum PersonalAccessToken lookup
3. Legacy app_users.api_token fallback

The legacy fallback is temporary and exists only to avoid breaking old dev tokens during migration.

## Role middleware

```text
backend/app/Http/Middleware/RequireRole.php
```

Registered alias:

```text
role
```

Usage example:

```php
Route::get('/dashboard/manager', ManagerDashboardController::class)
    ->middleware('role:manager,admin');
```

## Route-level protection

Routes are protected by role middleware in:

```text
backend/routes/api.php
```

Examples:

- manager dashboard: manager/admin
- approvals: manager/admin
- invoices: manager/admin
- documents: manager/admin
- employee tariff profile writes: admin
- field workflow button events: employee/manager/admin

## Controller checks

Some controllers still keep explicit role checks.

This is intentional defense-in-depth for MVP. Later we can remove duplicate checks after route policies are fully covered by tests.

## Run after pull

```bash
php artisan migrate
```

## Recommended next step

Add automated Laravel feature tests for:

- employee cannot access manager dashboard
- manager cannot edit employee tariffs
- admin can edit employee tariffs
- employee can send field workflow events
- manager can approve intervals and create invoices
