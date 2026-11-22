#!/bin/sh
set -eu

cd "$(dirname "$0")/.."

compose="docker compose -f docker-compose.yml -f docker-compose.prod.yml"

if ! count_output="$($compose exec -T backend node -e "const s = require('./src/config/db'); s.query('SELECT COUNT(*) AS n FROM cases', { type: 'SELECT', logging: false }).then(([row]) => { process.stdout.write(String(row.n)); return s.close(); }).catch((error) => { console.error(error.message); process.exit(1); });")"; then
    echo "first-seed.sh: could not read the case count; check the backend database connection before seeding" >&2
    exit 1
fi
count="$(printf '%s\n' "$count_output" | tail -n 1)"
case "$count" in
    ''|*[!0-9]*)
        echo "first-seed.sh: could not read a valid case count from the backend; no seed was run" >&2
        exit 1
        ;;
esac

if [ "$count" != 0 ]; then
    echo "first-seed.sh: the database already holds $count cases; the full seed would reset their opens, publishing and limits, so it is not run" >&2
    exit 1
fi

$compose exec -T backend sh -c "npm run seed && node scripts/buildPriceMap.js && node scripts/seedCases.js"
$compose restart backend
echo "first-seed.sh: items, prices and cases are in; the backend restarted to load them into Redis"
