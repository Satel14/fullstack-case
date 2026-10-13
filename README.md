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
admin edits, so run it only on a fresh database. Without `backend/scripts/data/market-usd.json` (gitignored, produced
by `node scripts/fetchMarketPrices.js`) `buildPriceMap.js` loads the committed `priceMap.json` instead of rebuilding
it. Email is off unless `RESEND_API_KEY` (and `RESEND_FROM`) is set in `.env`; while it is off, registration signs in
without confirming the email and password recovery is unavailable.
