# Auto deploy (GitHub Actions → rlci.ridnovir.in.ua)

Push to `main` → GitHub Actions connects to the server as `admin` with a
restricted SSH key → server runs `deploy/deploy.sh` from `origin/main`.

Manual run: GitHub → Actions → "Deploy production" → Run workflow.

## What deploy.sh does

1. Stops if the server has uncommitted changes in tracked files (no hand edits are lost).
2. `git fetch` + checkout `main`.
3. Backs up `backend/database/database.sqlite` to `/home/admin/backups/rail-crm/` (keeps 30).
4. `composer install` only if composer files changed; `php8.3 artisan migrate --force` only if migrations changed.
5. Frontend: `npm install` only if package.json changed, `npm run build`, `pm2 reload rail-crm-frontend`.
   If the build fails, the previous `.next` is restored and the site keeps running.
6. Health check: `https://rlci.ridnovir.in.ua/login` must answer 200.

## Rules

- Do not edit code directly on the server. Change it in git, push to `main`.
- Frontend runs under PM2 as `admin` only, never as `root`.
- Use `php8.3` for artisan (only 8.3 has `pdo_sqlite`).

## One-time server setup

Run as `admin`:

```bash
ssh-keygen -t ed25519 -N "" -C "github-actions-deploy" -f ~/.ssh/github_actions_deploy
APP=/home/admin/web/rlci.ridnovir.in.ua/public_html/_source
echo "command=\"cd $APP && git fetch -q origin main && git show origin/main:deploy/deploy.sh | bash -s\",no-port-forwarding,no-X11-forwarding,no-agent-forwarding,no-pty $(cat ~/.ssh/github_actions_deploy.pub)" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

GitHub → Settings → Secrets and variables → Actions → New repository secret:

| Secret | Value |
|---|---|
| `DEPLOY_HOST` | `77.42.56.171` |
| `DEPLOY_SSH_KEY` | contents of `~/.ssh/github_actions_deploy` (private key) |
| `DEPLOY_KNOWN_HOSTS` | output of `ssh-keyscan -t ed25519 77.42.56.171` |
