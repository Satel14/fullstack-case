const fs = require('fs');
const path = require('path');
const { enumerateItems } = require('./lib/enumerateItems');
const { buildPriceEntry, serializePriceMap } = require('./lib/priceEntry');
const { requirePriceMapCoverage } = require('./lib/priceMapCoverage');
const { assertMigrationsApplied } = require('../src/db/migrator');

const DATA_DIR = path.join(__dirname, 'data');
const MARKET_FILE = path.join(DATA_DIR, 'market-usd.json');
const PRICE_MAP_FILE = path.join(DATA_DIR, 'priceMap.json');
const FALLBACK_RATE = 41;

const loadMarket = (marketFile) => {
    const raw = JSON.parse(fs.readFileSync(marketFile, 'utf8'));
    const index = new Map();
    for (const it of raw.items) {
        const price = parseFloat(it.price);
        if (Number.isFinite(price) && price > 0) index.set(it.market_hash_name, price);
    }
    return { rate: raw.rate || FALLBACK_RATE, index };
};

const rebuildPriceMap = ({ marketFile, priceMapFile, items, log }) => {
    const { rate, index } = loadMarket(marketFile);
    log.log(`💱 rate=${rate}, market entries=${index.size}`);

    const priceMap = {};
    let matched = 0;
    for (const item of items) {
        const entry = buildPriceEntry(item, index, rate);
        if (entry.matched) matched++;
        priceMap[item.itemId] = {
            name: item.name,
            type: item.type,
            rare: item.rare,
            default: entry.default,
            painted: entry.painted,
        };
    }

    fs.mkdirSync(path.dirname(priceMapFile), { recursive: true });
    fs.writeFileSync(priceMapFile, serializePriceMap(priceMap));
    const pct = ((matched / items.length) * 100).toFixed(1);
    log.log(`✅ priceMap.json: ${items.length} items, ${matched} matched to market (${pct}%), ${items.length - matched} fallback`);
    return priceMap;
};

const committedPriceMap = ({ marketFile, priceMapFile, items, log }) => {
    if (!fs.existsSync(priceMapFile)) {
        throw new Error(
            `Neither ${marketFile} nor ${priceMapFile} exists. `
            + 'Run node scripts/fetchMarketPrices.js first; no item is priced without market data.',
        );
    }
    const priceMap = JSON.parse(fs.readFileSync(priceMapFile, 'utf8'));
    requirePriceMapCoverage(items, priceMap);
    log.log(`📄 No market-usd.json, so priceMap.json is not rebuilt: loading its ${Object.keys(priceMap).length} committed prices.`);
    return priceMap;
};

const pricesFor = ({
    marketFile = MARKET_FILE, priceMapFile = PRICE_MAP_FILE, items = enumerateItems(), log = console,
} = {}) => (
    fs.existsSync(marketFile)
        ? { priceMap: rebuildPriceMap({ marketFile, priceMapFile, items, log }), source: 'market' }
        : { priceMap: committedPriceMap({ marketFile, priceMapFile, items, log }), source: 'committed' }
);

const upsertPrices = async (priceMap, { required, log = console }) => {
    const InsiderPrices = require('../src/models/insiderPrices');
    const sequelize = require('../src/config/db');
    try {
        await sequelize.authenticate();
    } catch (e) {
        const reason = e.message || e.name;
        if (required) {
            throw new Error(`DB not reachable (${reason}); the committed prices were not loaded into insiderPrices.`);
        }
        log.warn(`⚠ DB not reachable (${reason}); skipping insiderPrices upsert. priceMap.json is still written.`);
        return;
    }
    await assertMigrationsApplied(sequelize);
    let n = 0;
    for (const id of Object.keys(priceMap)) {
        const p = priceMap[id];
        await InsiderPrices.upsert({
            name: p.name,
            pricesInCredits: JSON.stringify({ default: p.default, painted: p.painted }),
        });
        if (++n % 200 === 0) log.log(`  ✓ ${n} prices upserted...`);
    }
    log.log(`✓ Upserted ${n} insiderPrices rows`);
};

const main = async () => {
    const sequelize = require('../src/config/db');
    try {
        const { priceMap, source } = pricesFor();
        await upsertPrices(priceMap, { required: source === 'committed' });
    } finally {
        await sequelize.close();
    }
};

if (require.main === module) {
    main().catch((e) => {
        console.error('❌ buildPriceMap failed:', e.message);
        process.exit(1);
    });
}

module.exports = { pricesFor, upsertPrices };
