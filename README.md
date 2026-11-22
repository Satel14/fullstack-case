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

These commands are for local use only. For a server, follow [Deploying to a server](#deploying-to-a-server).

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
- **Updates:** <code>git pull</code>, then <code>docker compose up -d --build</code> and
  <code>docker compose restart nginx mysql-backup</code> (nginx resolves the recreated containers again, and the backup
  service picks up a changed script; it takes no new dump while the newest is younger than an interval). New migrations apply when the backend starts; it refuses to start while the
  database is ahead of or behind its code.
- **Redis** keeps its data (chat history) on the `redis-data` volume.
- **Backups:** the `mysql-backup` service writes a full dump of `case` to `./backups` when it starts (unless the newest dump is
  younger than an interval) and then every `BACKUP_INTERVAL_SECONDS` (a day by default), keeps the newest `BACKUP_KEEP` (14) and retries a failed dump after a
  minute; <code>docker compose ps</code> shows it unhealthy when the newest dump is more than a day and an hour old.
  The dumps hold every player's email and password hash and are readable by root only. Copy them off the server.
  A dump on demand, e.g. before a restore:
  <code>docker compose exec -e BACKUP_ONCE=1 -e BACKUP_FORCE=1 mysql-backup sh /ops/mysql-backup.sh</code>.
  To restore one, stop the backend first so no request writes half-way through, load the dump, retire every
  provably-fair seed that came back active (players saw draws on those seeds after the dump was taken; each gets a
  fresh seed on the next request), then start the backend:
  <code>docker compose stop backend</code>,
  <code>sudo cat backups/case-YYYYMMDD-HHMMSS.sql | docker exec -i fullstack-case sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" case'</code>,
  <code>echo "UPDATE provably_fair_seeds SET status='revealed', revealed_at=UTC_TIMESTAMP() WHERE status='active'" | docker exec -i fullstack-case sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" case'</code>,
  <code>docker compose start backend</code>.

## Deploying to a server

Use a VPS with at least 2 GB RAM running Ubuntu 24.04 (22.04 also works) and a domain. Point only an `A` record
at the VPS's IPv4 address. Do not add an `AAAA` record: Docker's userland proxy forwards IPv6 connections
through the IPv4-only compose networks with the same bridge gateway IP, so all
IPv6 visitors share IP-based rate limits.

For email, verify your domain in Resend using the DNS records it provides. After creating `.env` below,
set `RESEND_API_KEY` and `RESEND_FROM` to an address on that verified domain. Without a key the site runs
with mail off: registration signs in immediately and password recovery is unavailable.

Connect over SSH with an account that can use `sudo`. Replace `<repository-url>` with this repository's
Git URL, and use your own domain, email and login in the commands below:

```sh
sudo apt-get update
sudo apt-get install -y git
git clone <repository-url> fullstack-case
cd fullstack-case
sudo sh ops/server-setup.sh
```

The setup script installs Docker and its Compose plugin, configures the firewall, and adds 2 GB of swap
when a machine with less than 4 GB RAM has none. If your non-root account does not already have Docker
access, run `sudo usermod -aG docker "$USER"`, then disconnect and reconnect over SSH before continuing.

From the repository directory, create `.env` with fresh secrets:

```sh
sh ops/init-env.sh your-domain.com you@your-domain.com
```

The script refuses to overwrite an existing `.env`. Edit it to add your mail settings:

```dotenv
RESEND_API_KEY=your-resend-api-key
RESEND_FROM=CASES.UA <noreply@your-domain.com>
```

Set `REACT_APP_SUPPORT_EMAIL` too if you want the site to show a support address. Then deploy and seed
the fresh database once:

```sh
sh ops/deploy.sh
sh ops/first-seed.sh
```

The full seed resets case counters and admin settings, so `first-seed.sh` refuses an existing case
catalogue. Register at `https://your-domain.com`, then make that login an administrator:

```sh
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec backend npm run grant-admin -- <login>
```

For later updates, run:

```sh
sh ops/deploy.sh
```

It pulls with `git pull --ff-only`, removes any leftover local nginx container, rebuilds the containers,
and restarts Caddy and the backup service to refresh their bind-mounted files. It then waits for backend
health and checks `/api/health` over HTTPS. Migrations run automatically when the backend starts.

After `sh ops/deploy.sh`, if a release adds cases, run inside the backend container:

```sh
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec backend node scripts/seedCases.js --add-new
```

After deployment, if a release changes case prices, run inside the backend container:

```sh
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec backend node scripts/seedCases.js --prices-only
```

If a release does both, run both commands. These modes preserve existing case counters, publishing and
opening limits.

Database dumps land in `./backups`; copy them off the server too. Read a service's recent logs with:

```sh
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs --tail 100 <service>
```

To test HTTPS locally, first stop and remove the regular stack in the checkout where it was started:

```sh
docker compose down
```

The compose file pins container names and `127.0.0.1` ports, so the regular and HTTPS stacks cannot run
side by side, even from separate clones. Then use a fresh clone with Docker available. These commands
create `.env` with `DOMAIN=case.localhost` and start the production stack without pulling:

```sh
sh ops/init-env.sh case.localhost you@your-domain.com
sh ops/deploy.sh --no-pull
curl -k https://case.localhost/api/health
```

Open `https://case.localhost` and accept Caddy's local certificate. Caddy uses its own local CA for
`localhost` and names ending in `.localhost`; `deploy.sh` uses `curl --insecure` for those names only.
All other domains keep certificate verification enabled.

Only application ports 80 and 443 face the internet (443 also uses UDP); SSH remains open for
administration. Docker publishes ports past `ufw`, which is why the backend, MySQL and Redis ports bind
to `127.0.0.1`.

