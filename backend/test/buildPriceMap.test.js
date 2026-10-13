const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { resetTestDatabase } = require('./helpers/db');

let activeSequelize;

test.after(async () => {
    if (activeSequelize) {
        await activeSequelize.close();
    }
});

const COMMITTED_PRICE_MAP = path.join(__dirname, '..', 'scripts', 'data', 'priceMap.json');
const ABSENT = path.join(os.tmpdir(), `no-such-market-${process.pid}.json`);
const quietLog = { log() {}, warn() {}, error: console.error };

test('without market data the committed priceMap.json is loaded into insiderPrices as it is', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    const { pricesFor, upsertPrices } = require('../scripts/buildPriceMap');
    const before = fs.readFileSync(COMMITTED_PRICE_MAP, 'utf8');
    const committed = JSON.parse(before);

    const { priceMap, source } = pricesFor({ marketFile: ABSENT, priceMapFile: COMMITTED_PRICE_MAP, log: quietLog });
    await upsertPrices(priceMap, { required: true, log: quietLog });

    assert.strictEqual(source, 'committed');
    assert.deepStrictEqual(priceMap, committed);
    assert.strictEqual(fs.readFileSync(COMMITTED_PRICE_MAP, 'utf8'), before, 'the committed file must not be rewritten');

    const [rows] = await sequelize.query('SELECT name, pricesInCredits FROM insider_prices');
    const stored = Object.fromEntries(rows.map((row) => {
        const prices = typeof row.pricesInCredits === 'string' ? JSON.parse(row.pricesInCredits) : row.pricesInCredits;
        return [row.name, prices];
    }));
    const expected = Object.fromEntries(
        Object.values(committed).map((p) => [p.name, { default: p.default, painted: p.painted }]),
    );
    assert.deepStrictEqual(stored, expected);
});

test('without market data and without a price map nothing is priced', () => {
    const { pricesFor } = require('../scripts/buildPriceMap');

    assert.throws(
        () => pricesFor({ marketFile: ABSENT, priceMapFile: ABSENT, log: quietLog }),
        (error) => /fetchMarketPrices\.js/.test(error.message) && /no item is priced without market data/.test(error.message),
    );
});

test('a price map that no longer matches the image tree is refused', () => {
    const { pricesFor } = require('../scripts/buildPriceMap');
    const stale = path.join(os.tmpdir(), `stale-price-map-${process.pid}.json`);
    const committed = JSON.parse(fs.readFileSync(COMMITTED_PRICE_MAP, 'utf8'));
    delete committed[7];
    fs.writeFileSync(stale, JSON.stringify(committed));

    try {
        assert.throws(
            () => pricesFor({ marketFile: ABSENT, priceMapFile: stale, log: quietLog }),
            (error) => /no price for 1 items: 7/.test(error.message),
        );
    } finally {
        fs.unlinkSync(stale);
    }
});

test('loading the committed prices fails loudly when the database is unreachable', async () => {
    const { upsertPrices } = require('../scripts/buildPriceMap');
    const sequelize = require('../src/config/db');
    const authenticate = sequelize.authenticate;
    sequelize.authenticate = async () => { throw new Error('connect ECONNREFUSED'); };

    try {
        await assert.rejects(
            upsertPrices({}, { required: true, log: quietLog }),
            (error) => /ECONNREFUSED/.test(error.message) && /insiderPrices/.test(error.message),
        );
    } finally {
        sequelize.authenticate = authenticate;
    }
});
