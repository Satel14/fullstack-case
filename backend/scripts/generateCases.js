const fs = require('fs');
const path = require('path');
const ITEMS = require('../src/constant/itemConfigs');
const { generateCase, makeRng, BUCKETS } = require('./lib/caseGen');
const { COLLECTION_IDS, catalogue } = require('./lib/caseCatalog');
const { weaponCase, gradeCase, knifeCase, knifeChanceCases } = require('./lib/caseFamilies');
const { itemPool } = require('./lib/itemPool');
const { expectedValue } = require('./lib/valueWeights');

const CASES_DIR = path.join(__dirname, '../src/constant/cases');
const DATA_DIR = path.join(__dirname, 'data');
const PRICE_MAP_FILE = path.join(DATA_DIR, 'priceMap.json');
const GRADE_MAP_FILE = path.join(DATA_DIR, 'gradeMap.json');
const CASE_PRICES_FILE = path.join(DATA_DIR, 'casePrices.json');

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

const renderFamilyCaseFile = (result) => {
    const chanceLines = Object.entries(result.CHANCES).map(
        ([key, weight]) => `        ${key === ITEMS.GRADE.SPECIAL ? '[ITEMS_CONFIG.GRADE.SPECIAL]' : `'${key}'`}: ${weight},`,
    ).join('\n');
    const itemLines = result.ITEMS.map(
        (it) => `    { id: ${it.id}, rare: ${it.rare === ITEMS.GRADE.SPECIAL ? 'ITEMS_CONFIG.GRADE.SPECIAL' : `'${it.rare}'`}, colors: allColors },`,
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

const renderAllJs = (entries) => {
    const lines = entries.map(({ id }) => `    '${id}': require('./${fileFor(id)}'),`).join('\n');
    return `module.exports = {\n${lines}\n};\n`;
};

const MODEL_GRADES = new Set(BUCKETS.map((bucket) => bucket.key));
const FAMILY_BUILDERS = { weapon: weaponCase, grade: gradeCase, knife: knifeCase };

const buildCases = (priceMap, gradeMap, manifest = require('../src/constant/itemIds.json')) => {
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
    for (const id of COLLECTION_IDS) {
        const result = generateCase({ archetype: archetypeFor(id), pool, rng: makeRng(id) });
        files[`${fileFor(id)}.js`] = renderCaseFile(result);
        casePrices[id] = result.price;
        summary.push(`  ✓ ${id} [${archetypeFor(id)}] price=${result.price} ev=${result.ev.toFixed(0)} ratio=${(result.ev / result.price).toFixed(3)}`);
    }
    const entries = catalogue();
    const familyPool = itemPool({ manifest, priceMap, gradeMap });
    const knifeChances = new Map(knifeChanceCases(
        familyPool, entries.filter(({ family }) => family === 'knife-chance'),
    ).map((result) => [result.id, result]));
    for (const entry of entries.filter(({ family }) => family !== 'collection')) {
        const result = entry.family === 'knife-chance'
            ? knifeChances.get(entry.id)
            : FAMILY_BUILDERS[entry.family](familyPool, entry);
        files[`${entry.id}.js`] = renderFamilyCaseFile(result);
        casePrices[entry.id] = result.price;
        const ev = expectedValue(result.values, result.ITEMS.map(({ rare }) => result.CHANCES[rare]));
        summary.push(`  ✓ ${entry.id} [${entry.family}] price=${result.price} ev=${ev.toFixed(0)} ratio=${(ev / result.price).toFixed(3)}`);
    }
    files['_all.js'] = renderAllJs(entries);

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
        const file = path.join(CASES_DIR, name);
        const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n') : null;
        if (current !== content) fs.writeFileSync(file, content);
    }
    summary.forEach((line) => console.log(line));
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(CASE_PRICES_FILE, JSON.stringify(casePrices, null, 2));
    console.log(`✅ Generated ${summary.length} cases + _all.js + casePrices.json`);
};

if (require.main === module) {
    main();
}

module.exports = { buildCases };
