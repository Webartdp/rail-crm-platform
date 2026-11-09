#!/usr/bin/env bash
# Production deploy for rlci.ridnovir.in.ua
# Runs on the server as user `admin` (called by GitHub Actions via a restricted SSH key).
# Safe by design:
#   - refuses to run if the server has uncommitted changes in tracked files
#   - backs up the SQLite database before migrations
#   - keeps the previous Next.js build and restores it if the new build fails
#   - checks that the site answers after restart
set -euo pipefail

APP_DIR="/home/admin/web/rlci.ridnovir.in.ua/public_html/_source"
BRANCH="${DEPLOY_BRANCH:-main}"
PHP="php8.3"                       # only php8.3 has pdo_sqlite on this server
PM2_NAME="rail-crm-frontend"
SITE_URL="https://rlci.ridnovir.in.ua/login"
BACKUP_DIR="/home/admin/backups/rail-crm"
KEEP_BACKUPS=30

export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"

log() { echo "[deploy $(date '+%Y-%m-%d %H:%M:%S')] $*"; }
fail() { log "ERROR: $*"; exit 1; }

cd "$APP_DIR"

# 1. Never overwrite hand edits made directly on the server.
if ! git diff --quiet || ! git diff --cached --quiet; then
  git status --short | grep -v '^??' || true
  fail "server has uncommitted changes in tracked files; commit or discard them first"
fi

# 2. Fetch and decide what changed.
git fetch --prune -q origin "$BRANCH"
OLD="$(git rev-parse HEAD)"
NEW="$(git rev-parse "origin/$BRANCH")"

if [ "$OLD" = "$NEW" ] && [ "$(git branch --show-current)" = "$BRANCH" ] && [ "${FORCE:-0}" != "1" ]; then
  log "already at ${NEW:0:7}, nothing to deploy"
  exit 0
fi

changed() { git diff --name-only "$OLD" "$NEW" -- "$@" | grep -q .; }

BACKEND_DEPS=0; FRONTEND_DEPS=0; FRONTEND_CODE=1; MIGRATIONS=0
changed backend/composer.json backend/composer.lock && BACKEND_DEPS=1
changed frontend/package.json frontend/package-lock.json && FRONTEND_DEPS=1
changed backend/database/migrations && MIGRATIONS=1
if [ "$OLD" != "$NEW" ] && ! changed frontend; then FRONTEND_CODE=0; fi

log "deploying $BRANCH: ${OLD:0:7} -> ${NEW:0:7}"
git log --oneline "$OLD..$NEW" 2>/dev/null | head -20 || true

git checkout -q -B "$BRANCH" "origin/$BRANCH"

# 3. Backend.
mkdir -p "$BACKUP_DIR"
DB="backend/database/database.sqlite"
if [ -f "$DB" ]; then
  cp -a "$DB" "$BACKUP_DIR/database-$(date +%Y%m%d-%H%M%S)-${OLD:0:7}.sqlite"
  ls -1t "$BACKUP_DIR"/database-*.sqlite | tail -n +"$((KEEP_BACKUPS + 1))" | xargs -r rm --
  log "database backed up"
fi

cd "$APP_DIR/backend"
if [ "$BACKEND_DEPS" = "1" ] || [ ! -d vendor ]; then
  log "composer install"
  "$PHP" "$(command -v composer)" install --no-dev --no-interaction --prefer-dist --optimize-autoloader
fi
if [ "$MIGRATIONS" = "1" ]; then
  log "running migrations"
  "$PHP" artisan migrate --force
fi
"$PHP" artisan optimize:clear >/dev/null

# 4. Frontend.
cd "$APP_DIR/frontend"
if [ "$FRONTEND_CODE" = "1" ] || [ "${FORCE:-0}" = "1" ]; then
  if [ "$FRONTEND_DEPS" = "1" ] || [ ! -d node_modules ]; then
    log "npm install"
    npm install --no-audit --no-fund
  fi

  rm -rf .next.prev
  [ -d .next ] && cp -a .next .next.prev

  log "next build"
  if ! npm run build; then
    if [ -d .next.prev ]; then
      rm -rf .next && mv .next.prev .next
      log "build failed, previous build restored (site keeps running old frontend)"
    fi
    fail "frontend build failed"
  fi

  log "restarting $PM2_NAME"
  pm2 reload "$PM2_NAME" --update-env || pm2 restart "$PM2_NAME" --update-env
  pm2 save >/dev/null
else
  log "no frontend changes, skipping build"
fi

# 5. Health check.
for i in $(seq 1 15); do
  CODE="$(curl -s -o /dev/null -w '%{http_code}' "$SITE_URL" || true)"
  if [ "$CODE" = "200" ]; then
    log "OK: site answers 200, deployed ${NEW:0:7}"
    rm -rf "$APP_DIR/frontend/.next.prev"
    exit 0
  fi
  sleep 2
done
fail "site did not answer 200 after deploy (last code: $CODE). Previous build kept in frontend/.next.prev"
