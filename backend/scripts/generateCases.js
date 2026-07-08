const fs = require('fs');
const path = require('path');
const ITEMS = require('../src/constant/itemConfigs');
const { generateCase, makeRng } = require('./lib/caseGen');

const CASES_DIR = path.join(__dirname, '../src/constant/cases');
const DATA_DIR = path.join(__dirname, 'data');
const PRICE_MAP_FILE = path.join(DATA_DIR, 'priceMap.json');
const CASE_PRICES_FILE = path.join(DATA_DIR, 'casePrices.json');

const CASE_IDS = [
    'bomj', 'havoc', 'cobblestone', 'chop-shop', 'train', 'alpha', 'nuke-op', 'st-marc',
    'lake', 'baggage', 'bank', 'gods-monster', 'mirage-op', 'cache', 'norse', 'sportfield',
    'inferno-op', 'anubis', 'dust2-op', 'rising-sun', 'safehouse', 'ancient', 'italy',
    'graphic', 'overpass', 'nuke', 'vertigo-2021', 'control', 'dust2-2021', 'mirage-2021',
    'dust2', 'overpass-old', 'inferno-old', 'vertigo-old', 'velocity', 'victory',
    'vindicator', 'zephyr',
];

const CASE_FILES = { 'st-marc': 'stmarc', 'rising-sun': 'risingsun' };
const fileFor = (id) => CASE_FILES[id] || id;

const ARCHETYPE_MAP = {
    bomj: 'budget', 'vertigo-old': 'budget', 'inferno-old': 'budget', 'overpass-old': 'budget',
    velocity: 'budget', victory: 'budget', vindicator: 'budget', zephyr: 'budget', 'chop-shop': 'budget',
    anubis: 'premium', ancient: 'premium', overpass: 'premium', cobblestone: 'premium', havoc: 'premium',
    control: 'elite', 'gods-monster': 'elite',
};
const archetypeFor = (id) => ARCHETYPE_MAP[id] || 'standard';

const RARE_CONST = {
    [ITEMS.RARITY.FACTORY_NEW]: 'FACTORY_NEW',
    [ITEMS.RARITY.MINIMAL_WEAR]: 'MINIMAL_WEAR',
    [ITEMS.RARITY.FIELD_TESTED]: 'FIELD_TESTED',
    [ITEMS.RARITY.WELL_WORN]: 'WELL_WORN',
    [ITEMS.RARITY.BATTLE_SCARRED]: 'BATTLE_SCARRED',
};

const renderCaseFile = (result) => {
    const itemLines = result.ITEMS.map(
        (it) => `    { id: ${it.id}, rare: ITEMS_CONFIG.RARITY.${RARE_CONST[it.rare]}, colors: allColors },`,
    ).join('\n');
    return `const ITEMS_CONFIG = require('../../constant/itemConfigs')

const allColors = [
    ITEMS_CONFIG.COLORS.DEFAULT,
    ITEMS_CONFIG.COLORS.PAINTED,
];

module.exports = {
    CHANCES: {
        [ITEMS_CONFIG.RARITY.FACTORY_NEW]: 55,
        [ITEMS_CONFIG.RARITY.MINIMAL_WEAR]: 28,
        [ITEMS_CONFIG.RARITY.FIELD_TESTED]: 12,
        [ITEMS_CONFIG.RARITY.WELL_WORN]: 4,
        [ITEMS_CONFIG.RARITY.BATTLE_SCARRED]: 1,
        COLORS: {
            DEFAULT: 90,
            PAINTED: 10,
            LIST: {
                [ITEMS_CONFIG.COLORS.DEFAULT]: 50,
                [ITEMS_CONFIG.COLORS.PAINTED]: 50,
            },
        },
    },
    ITEMS: [
${itemLines}
    ],
};
`;
};

const renderAllJs = () => {
    const lines = CASE_IDS.map((id) => `    '${id}': require('./${fileFor(id)}'),`).join('\n');
    return `module.exports = {\n${lines}\n};\n`;
};

const main = () => {
    if (!fs.existsSync(PRICE_MAP_FILE)) {
        console.error(`❌ ${PRICE_MAP_FILE} missing. Run buildPriceMap.js first.`);
        process.exit(1);
    }
    const priceMap = JSON.parse(fs.readFileSync(PRICE_MAP_FILE, 'utf8'));
    const pool = Object.entries(priceMap).map(([itemId, p]) => ({
        itemId: Number(itemId),
        isKnife: p.type === 'knife',
        evValue: 0.9 * p.default + 0.1 * p.painted,
    }));

    const casePrices = {};
    for (const id of CASE_IDS) {
        const result = generateCase({ archetype: archetypeFor(id), pool, rng: makeRng(id) });
        fs.writeFileSync(path.join(CASES_DIR, `${fileFor(id)}.js`), renderCaseFile(result));
        casePrices[id] = result.price;
        console.log(`  ✓ ${id} [${archetypeFor(id)}] price=${result.price} ev=${result.ev.toFixed(0)} ratio=${(result.ev / result.price).toFixed(3)}`);
    }

    fs.writeFileSync(path.join(CASES_DIR, '_all.js'), renderAllJs());
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(CASE_PRICES_FILE, JSON.stringify(casePrices, null, 2));
    console.log(`✅ Generated ${CASE_IDS.length} cases + _all.js + casePrices.json`);
};

main();
