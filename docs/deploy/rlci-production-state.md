# RLCI production deployment state

Date: 2026-07-21

Domain:

- https://rlci.ridnovir.in.ua

Frontend:

- Next.js runs through PM2.
- PM2 process name: `rail-crm-frontend`
- Host: `127.0.0.1`
- Port: `3000`
- Frontend path: `/home/admin/web/rlci.ridnovir.in.ua/public_html/_source/frontend`
- Public frontend API URL: `https://rlci.ridnovir.in.ua/api/api/v1`

Backend:

- Laravel API is served through the public `/api/` gateway.
- Public API base URL: `https://rlci.ridnovir.in.ua/api/api/v1`
- Backend path: `/home/admin/web/rlci.ridnovir.in.ua/public_html/_source/backend`

Nginx:

- Live include path:
  `/home/admin/conf/web/rlci.ridnovir.in.ua/nginx.ssl.conf_next_routes`

- Repository copy:
  `docs/deploy/nginx.rlci.next-routes.conf`

Current routing logic:

- `/`
- `/login`
- `/admin`
- `/employee`
- `/employees`
- `/manager-dashboard`
- `/work-events`
- `/approvals`
- `/assignments`
- `/billing`
- `/clients`
- `/objects`
- `/documents`
- `/audit`
- `/demo`
- `/maps`
- `/durations`
- `/costs`
- `/status`
- `/work-orders`
- `/_next/`

These routes are proxied to Next.js on `127.0.0.1:3000`.

API routes remain on Laravel/Apache through:

- `/api/api/v1`

Important notes:

- Do not commit `.env.local`.
- Do not commit `.env`.
- Do not commit `.next`.
- Do not commit `node_modules`.
- Run frontend and PM2 as `admin`, not as `root`.
- Use `root` only for Nginx or server-level permissions.
