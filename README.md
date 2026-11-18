# fullstack-case

<li>Frontend</li>
<li>React.js</li>
<li>TypeScript</li>
<li>Redux</li>
<li>Antd</li>
<li>SCSS</li>

## How to install
Folder backend <code>npm install</code>

Folder frontend <code>npm install</code>

## Docker
Copy <code>.env.example</code> to <code>.env</code> in the repository root and set `JWT_SECRET` to a long random value,
e.g. <code>node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"</code> — every `docker compose`
command refuses to run without it.

<code>docker compose up -d --build</code> — site on http://localhost:3009, MySQL 8 on 127.0.0.1:3307.

The backend applies migrations on start. The database starts empty, so fill it once:

<code>docker exec fullstack_case_backend sh -c "npm run seed && node scripts/buildPriceMap.js && node scripts/seedCases.js"</code>

then <code>docker compose restart backend</code> to load the items into Redis. `seedCases.js` resets case counters and
admin edits, so run it only on a fresh database. When an update brings regenerated cases (new contents and
`casePrices.json`) to a stack that already has data, rebuild the backend first —
<code>docker compose up -d --build backend</code>, then <code>docker compose restart nginx</code> — and straight away
re-price the existing cases with <code>docker exec fullstack_case_backend node scripts/seedCases.js --prices-only</code>,
which changes only the price (and clears a sale the new price meets or exceeds). Without `backend/scripts/data/market-usd.json` (gitignored, produced
by `node scripts/fetchMarketPrices.js`) `buildPriceMap.js` loads the committed `priceMap.json` instead of rebuilding
it. Email is off while `RESEND_API_KEY` in `.env` is empty: registration then signs in without confirming the email,
and password recovery is unavailable. To turn it on, set `RESEND_API_KEY` and set `RESEND_FROM` to an address on a
domain verified in Resend. With the default `onboarding@resend.dev` sender, mail reaches only the Resend account owner,
so no one else can confirm a registration or receive a password-reset link.

## Operating the stack
- **Administrator:** register on the site, then <code>docker exec fullstack_case_backend npm run grant-admin -- &lt;login&gt;</code>
  (the only way to make an administrator). The admin panel then has statistics, cases, users (player card, balance
  correction, chat mute), articles, promocodes, the action log and settings (the item sale rate).
- **Health:** <code>GET /api/health</code> answers 200 while MySQL answers (`degraded` when only Redis is down) and 503 when
  MySQL is down or the backend is stopping. Compose uses it as the backend healthcheck.
- **Stopping:** <code>docker compose stop</code> lets the backend finish requests, sweeps and pools within 10 s and exit 0;
  the backend restarts on its own after a Docker or host restart (`restart: unless-stopped`).
- **Updates:** <code>git pull</code>, then <code>docker compose up -d --build backend frontend</code> and
  <code>docker compose restart nginx</code>. New migrations apply when the backend starts; it refuses to start while the
  database is ahead of or behind its code.
- **Redis** keeps its data (chat history) on the `redis-data` volume.
- **Backups:** the `mysql-backup` service writes a full dump of `case` to `./backups` when it starts and then every
  `BACKUP_INTERVAL_SECONDS` (a day by default), keeps the newest `BACKUP_KEEP` (14) and retries a failed dump after a
  minute; <code>docker compose ps</code> shows it unhealthy when the newest dump is more than a day and an hour old.
  The dumps hold every player's email and password hash and are readable by root only. Copy them off the server.
  Restore one into the running database (this replaces its contents):
  <code>sudo cat backups/case-YYYYMMDD-HHMMSS.sql | docker exec -i fullstack-case sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" case'</code>,
  then <code>docker compose restart backend</code>.

