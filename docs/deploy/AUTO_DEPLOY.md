# Auto deploy (pull-based) → rlci.ridnovir.in.ua

The hosting provider firewall blocks inbound SSH from GitHub, so deploy is pull-based:
a cron job on the server (user `admin`) checks GitHub every minute and runs
`deploy/deploy.sh` from `origin/main` when `main` has a new commit.

Flow: push / merge to `main` → within ~1 minute the server deploys it.

Log: `/home/admin/backups/rail-crm/deploy.log`

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

## One-time server setup (as admin)

```bash
mkdir -p ~/bin ~/backups/rail-crm
cat > ~/bin/rail-crm-autodeploy.sh <<'EOF'
#!/usr/bin/env bash
cd /home/admin/web/rlci.ridnovir.in.ua/public_html/_source || exit 1
git fetch -q origin main || exit 1
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] && exit 0
git show origin/main:deploy/deploy.sh | bash -s
EOF
chmod +x ~/bin/rail-crm-autodeploy.sh
(crontab -l 2>/dev/null | grep -v rail-crm-autodeploy; echo '* * * * * flock -n $HOME/backups/rail-crm/deploy.lock $HOME/bin/rail-crm-autodeploy.sh >> $HOME/backups/rail-crm/deploy.log 2>&1') | crontab -
```

Disable: `crontab -l | grep -v rail-crm-autodeploy | crontab -`
