const fs = require('fs');
const path = require('path');
const { enumerateItems } = require('./lib/enumerateItems');
const { gradesBySkin, gradeItems, serializeGradeMap } = require('./lib/marketGrade');

const MARKET_URL = 'https://market.csgo.com/api/v2/prices/class_instance/USD.json';
const GRADE_MAP_FILE = path.join(__dirname, 'data', 'gradeMap.json');

const loadListings = async (file) => {
    if (file) {
        console.log(`📄 Reading market listings from ${file}`);
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
    console.log('🌐 Fetching market.csgo.com listings (about 200 MB)...');
    const res = await fetch(MARKET_URL, { headers: { 'User-Agent': 'case-seed/1.0' } });
    if (!res.ok) throw new Error(`${MARKET_URL} → HTTP ${res.status}`);
    return res.json();
};

const main = async () => {
    const listings = await loadListings(process.argv[2]);
    if (!listings || !listings.items || typeof listings.items !== 'object') {
        throw new Error('Unexpected market response shape (no items object)');
    }
    const { grades, missing } = gradeItems(enumerateItems(), gradesBySkin(Object.values(listings.items)));
    if (missing.length > 0) {
        throw new Error(
            `${missing.length} items have no grade on market.csgo.com: ${missing.join(', ')}. `
            + 'Add their market names to MARKET_NAMES in scripts/lib/marketGrade.js.',
        );
    }
    fs.writeFileSync(GRADE_MAP_FILE, serializeGradeMap(grades));
    console.log(`✅ Saved the grades of ${Object.keys(grades).length} items → ${GRADE_MAP_FILE}`);
};

main().catch((e) => {
    console.error('❌ fetchMarketGrades failed:', e.message);
    process.exit(1);
});
