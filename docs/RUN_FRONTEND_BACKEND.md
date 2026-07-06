# Run Frontend and Backend

## 1. Update repository

```bash
git pull
```

## 2. Start services

```bash
docker compose up -d
```

## 3. Backend

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve
```

Backend API:

```text
http://localhost:8000/api/v1
```

## 4. Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend:

```text
http://localhost:3000
```

## 5. Test workflow

Open:

```text
http://localhost:3000/demo
```

Click the workflow buttons. If backend is running, events should be sent to API and saved to work_events.

If backend is not running, demo will log actions locally.
