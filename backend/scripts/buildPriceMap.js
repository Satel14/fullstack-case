const fs = require('fs');
const path = require('path');
const { enumerateItems } = require('./lib/enumerateItems');
const { buildPriceEntry } = require('./lib/priceEntry');

const DATA_DIR = path.join(__dirname, 'data');
const MARKET_FILE = path.join(DATA_DIR, 'market-usd.json');
const OUT_FILE = path.join(DATA_DIR, 'priceMap.json');
const FALLBACK_RATE = 41;

const loadMarket = () => {
    if (!fs.existsSync(MARKET_FILE)) {
        console.warn(`⚠ ${MARKET_FILE} not found — every item will use the fallback model.`);
        return { rate: FALLBACK_RATE, index: new Map() };
    }
    const raw = JSON.parse(fs.readFileSync(MARKET_FILE, 'utf8'));
    const index = new Map();
    for (const it of raw.items) {
        const price = parseFloat(it.price);
        if (Number.isFinite(price) && price > 0) index.set(it.market_hash_name, price);
    }
    return { rate: raw.rate || FALLBACK_RATE, index };
};

const upsertPrices = async (priceMap) => {
    let InsiderPrices;
    let sequelize;
    try {
        InsiderPrices = require('../src/models/insiderPrices');
        sequelize = require('../src/config/db');
        await sequelize.authenticate();
    } catch (e) {
        console.warn(`⚠ DB not reachable (${e.message}); skipping insiderPrices upsert. priceMap.json is still written.`);
        return;
    }
    await sequelize.sync();
    let n = 0;
    for (const id of Object.keys(priceMap)) {
        const p = priceMap[id];
        await InsiderPrices.upsert({
            name: p.name,
            pricesInCredits: JSON.stringify({ default: p.default, painted: p.painted }),
        });
        if (++n % 200 === 0) console.log(`  ✓ ${n} prices upserted...`);
    }
    console.log(`✓ Upserted ${n} insiderPrices rows`);
    await sequelize.close();
};

const main = async () => {
    const { rate, index } = loadMarket();
    console.log(`💱 rate=${rate}, market entries=${index.size}`);

    const items = enumerateItems();
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

    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(OUT_FILE, JSON.stringify(priceMap, null, 0));
    const pct = ((matched / items.length) * 100).toFixed(1);
    console.log(`✅ priceMap.json: ${items.length} items, ${matched} matched to market (${pct}%), ${items.length - matched} fallback`);

    await upsertPrices(priceMap);
};

main().catch((e) => {
    console.error('❌ buildPriceMap failed:', e.message);
    process.exit(1);
});
