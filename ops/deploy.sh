#!/bin/sh
set -eu

cd "$(dirname "$0")/.."

pull=1
for argument in "$@"; do
    case "$argument" in
        --no-pull) pull=0 ;;
        *) echo "deploy.sh: unknown argument $argument (the only option is --no-pull)" >&2; exit 2 ;;
    esac
done

if [ ! -f .env ]; then
    echo "deploy.sh: there is no .env here; create it with: sh ops/init-env.sh <domain> <email>" >&2
    exit 1
fi
domain="$(sed -n 's/^DOMAIN=//p' .env | tail -n 1)"
if [ -z "$domain" ]; then
    echo "deploy.sh: DOMAIN is empty in .env" >&2
    exit 1
fi

compose="docker compose -f docker-compose.yml -f docker-compose.prod.yml"

if [ "$pull" = 1 ]; then
    git pull --ff-only
fi
$compose up -d --build --remove-orphans

limit="${DEPLOY_HEALTH_TIMEOUT:-180}"
waited=0
until [ "$(docker inspect -f '{{.State.Health.Status}}' fullstack_case_backend 2>/dev/null || true)" = healthy ]; do
    if [ "$waited" -ge "$limit" ]; then
        echo "deploy.sh: the backend is not healthy after ${limit}s; read its logs with: $compose logs --tail 100 backend" >&2
        exit 1
    fi
    sleep 5
    waited=$((waited + 5))
done

tries=0
until curl -fsS --max-time 5 "https://$domain/api/health" >/dev/null; do
    tries=$((tries + 1))
    if [ "$tries" -ge "${DEPLOY_HTTPS_TRIES:-12}" ]; then
        echo "deploy.sh: https://$domain/api/health does not answer; read Caddy's logs with: $compose logs --tail 100 caddy" >&2
        exit 1
    fi
    sleep 5
done

echo "deploy.sh: https://$domain is up"
