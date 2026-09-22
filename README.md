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
<code>docker compose up -d --build</code> — site on http://localhost:3009, MySQL 8 on host port 3307.

The backend applies migrations on start. The database starts empty, so fill it once:

<code>docker exec fullstack_case_backend sh -c "npm run seed && node scripts/buildPriceMap.js && node scripts/seedCases.js"</code>

then <code>docker compose restart backend</code> to load the items into Redis. `seedCases.js` resets case counters and
admin edits, so run it only on a fresh database. `buildPriceMap.js` needs `backend/scripts/data/market-usd.json`
(gitignored, produced by `node scripts/fetchMarketPrices.js`). Email is off unless `RESEND_API_KEY` is set on the
backend service, and password recovery is unavailable while it is off.
