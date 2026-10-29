const fs = require('fs');
const path = require('path');
const ITEMS = require('../src/constant/itemConfigs');
const { generateCase, makeRng, BUCKETS } = require('./lib/caseGen');

const CASES_DIR = path.join(__dirname, '../src/constant/cases');
const DATA_DIR = path.join(__dirname, 'data');
const PRICE_MAP_FILE = path.join(DATA_DIR, 'priceMap.json');
const GRADE_MAP_FILE = path.join(DATA_DIR, 'gradeMap.json');
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

const GRADE_CONST = Object.fromEntries(Object.entries(ITEMS.GRADE).map(([name, id]) => [id, name]));

const renderCaseFile = (result) => {
    const chanceLines = BUCKETS.map(
        (bucket) => `        [ITEMS_CONFIG.GRADE.${GRADE_CONST[bucket.key]}]: ${bucket.weight},`,
    ).join('\n');
    const itemLines = result.ITEMS.map(
        (it) => `    { id: ${it.id}, rare: ITEMS_CONFIG.GRADE.${GRADE_CONST[it.rare]}, colors: allColors },`,
    ).join('\n');
    return `const ITEMS_CONFIG = require('../../constant/itemConfigs')

const allColors = [
    ITEMS_CONFIG.COLORS.DEFAULT,
    ITEMS_CONFIG.COLORS.PAINTED,
];

module.exports = {
    CHANCES: {
${chanceLines}
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

const MODEL_GRADES = new Set(BUCKETS.map((bucket) => bucket.key));

const buildCases = (priceMap, gradeMap) => {
    const pool = Object.entries(priceMap)
        .filter(([itemId]) => MODEL_GRADES.has(gradeMap[itemId]))
        .map(([itemId, p]) => ({
            itemId: Number(itemId),
            grade: gradeMap[itemId],
            evValue: 0.9 * p.default + 0.1 * p.painted,
        }));

    const files = {};
    const casePrices = {};
    const summary = [];
    for (const id of CASE_IDS) {
        const result = generateCase({ archetype: archetypeFor(id), pool, rng: makeRng(id) });
        files[`${fileFor(id)}.js`] = renderCaseFile(result);
        casePrices[id] = result.price;
        summary.push(`  ✓ ${id} [${archetypeFor(id)}] price=${result.price} ev=${result.ev.toFixed(0)} ratio=${(result.ev / result.price).toFixed(3)}`);
    }
    files['_all.js'] = renderAllJs();

    return { files, casePrices, summary };
};

const main = () => {
    if (!fs.existsSync(PRICE_MAP_FILE)) {
        console.error(`❌ ${PRICE_MAP_FILE} missing. Run buildPriceMap.js first.`);
        process.exit(1);
    }
    if (!fs.existsSync(GRADE_MAP_FILE)) {
        console.error(`❌ ${GRADE_MAP_FILE} missing. Run fetchMarketGrades.js first.`);
        process.exit(1);
    }
    const priceMap = JSON.parse(fs.readFileSync(PRICE_MAP_FILE, 'utf8'));
    const gradeMap = JSON.parse(fs.readFileSync(GRADE_MAP_FILE, 'utf8'));
    const { files, casePrices, summary } = buildCases(priceMap, gradeMap);

    for (const [name, content] of Object.entries(files)) {
        fs.writeFileSync(path.join(CASES_DIR, name), content);
    }
    summary.forEach((line) => console.log(line));
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(CASE_PRICES_FILE, JSON.stringify(casePrices, null, 2));
    console.log(`✅ Generated ${CASE_IDS.length} cases + _all.js + casePrices.json`);
};

if (require.main === module) {
    main();
}

module.exports = { buildCases };
