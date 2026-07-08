const fs = require('fs');
const path = require('path');

const MARKET_URL = 'https://market.csgo.com/api/v2/prices/USD.json';
const NBU_URL = 'https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=USD&json';
const FALLBACK_RATE = 41;
const OUT_DIR = path.join(__dirname, 'data');
const OUT_FILE = path.join(OUT_DIR, 'market-usd.json');

const fetchJson = async (url) => {
    const res = await fetch(url, { headers: { 'User-Agent': 'case-seed/1.0' } });
    if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
    return res.json();
};

const getRate = async () => {
    try {
        const data = await fetchJson(NBU_URL);
        const rate = Array.isArray(data) && data[0] && data[0].rate;
        if (rate) {
            console.log(`✓ NBU USD→UAH rate: ${rate}`);
            return rate;
        }
    } catch (e) {
        console.warn(`⚠ NBU rate fetch failed (${e.message}); using fallback ${FALLBACK_RATE}`);
    }
    return FALLBACK_RATE;
};

const main = async () => {
    console.log('🌐 Fetching market.csgo.com USD prices...');
    const market = await fetchJson(MARKET_URL);
    if (!market || !Array.isArray(market.items)) {
        throw new Error('Unexpected market response shape (no items array)');
    }
    const rate = await getRate();

    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(OUT_FILE, JSON.stringify({
        fetchedAt: new Date().toISOString(),
        rate,
        items: market.items,
    }));
    console.log(`✅ Saved ${market.items.length} prices + rate ${rate} → ${OUT_FILE}`);
};

main().catch((e) => {
    console.error('❌ fetchMarketPrices failed:', e.message);
    process.exit(1);
});
