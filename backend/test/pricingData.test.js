const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const {
    COLLECTION_IDS, WEAPON_CASES, KNIFE_CASES, GRADE_CASES, KNIFE_CHANCE_CASES, catalogue,
} = require('../scripts/lib/caseCatalog');
const { itemPool } = require('../scripts/lib/itemPool');
const { TOTAL_WEIGHT, realisedReturn } = require('../scripts/lib/valueWeights');
const { HOUSE_RETURN } = require('../scripts/lib/caseGen');
const { GRADE, COLORS } = require('../src/constant/itemConfigs');
const manifest = require('../src/constant/itemIds.json');
const allCases = require('../src/constant/cases/_all');

const BACKEND = path.join(__dirname, '..');
const CASES_DIR = path.join(BACKEND, 'src', 'constant', 'cases');
const PUBLIC_DIR = path.join(BACKEND, '..', 'frontend', 'public');
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(BACKEND, 'scripts', 'data', file), 'utf8'));
const readCaseFile = (name) => fs.readFileSync(path.join(CASES_DIR, name), 'utf8').replace(/\r\n/g, '\n');

const generated = (itemManifest) => {
    const { buildCases } = require('../scripts/generateCases');
    return buildCases(readJson('priceMap.json'), readJson('gradeMap.json'), itemManifest);
};

const committedPool = () => itemPool({ manifest, priceMap: readJson('priceMap.json'), gradeMap: readJson('gradeMap.json') });
const caseFor = ({ id }) => {
    assert.ok(allCases[id], `${id} is not registered`);
    return allCases[id];
};

test('every catalogue image is an existing WebP file, with one image shared by bomj and victory', () => {
    const entries = catalogue();
    for (const entry of entries) {
        assert.match(entry.image, /^\/img\/case\/[^/]+\.webp$/, entry.id);
        assert.ok(fs.statSync(path.join(PUBLIC_DIR, entry.image.slice(1))).isFile(), entry.id);
    }
    assert.strictEqual(new Set(entries.map(({ image }) => image)).size, 73);
    assert.strictEqual(entries.find(({ id }) => id === 'bomj').image, '/img/case/case-victory.webp');
    assert.strictEqual(entries.find(({ id }) => id === 'victory').image, '/img/case/case-victory.webp');
});

test('the case image directory contains no PNG files', () => {
    assert.deepStrictEqual(fs.readdirSync(path.join(PUBLIC_DIR, 'img', 'case')).filter((name) => /\.png$/i.test(name)), []);
});

test('the committed priceMap.json regenerates exactly the committed case files', () => {
    const { files } = generated();

    assert.strictEqual(Object.keys(files).length, 75);
    assert.deepStrictEqual(
        Object.keys(files).sort(),
        fs.readdirSync(CASES_DIR).filter((name) => name.endsWith('.js')).sort(),
    );
    for (const [name, content] of Object.entries(files)) {
        assert.strictEqual(content, readCaseFile(name), `${name} differs from what priceMap.json generates`);
    }
});

test('the committed casePrices.json holds the prices the committed priceMap.json yields', () => {
    assert.deepStrictEqual(generated().casePrices, readJson('casePrices.json'));
});

test('the committed priceMap.json prices every item of the image tree under its id', () => {
    const { enumerateItems } = require('../scripts/lib/enumerateItems');
    const { priceMapGaps } = require('../scripts/lib/priceMapCoverage');

    assert.deepStrictEqual(priceMapGaps(enumerateItems(), readJson('priceMap.json')), { missing: [], mismatched: [] });
});

test('the committed casePrices.json prices every case in _all.js and nothing else', () => {
    assert.deepStrictEqual(Object.keys(readJson('casePrices.json')).sort(), Object.keys(allCases).sort());
});

test('the committed gradeMap.json gives every item of the image tree a known grade, and nothing else', () => {
    const { enumerateItems } = require('../scripts/lib/enumerateItems');
    const { GRADES } = require('../scripts/lib/marketGrade');
    const grades = readJson('gradeMap.json');

    assert.deepStrictEqual(Object.keys(grades).sort(), enumerateItems().map((item) => String(item.itemId)).sort());
    assert.deepStrictEqual(Object.entries(grades).filter(([, grade]) => !GRADES.includes(grade)), []);
});

test('every item of every committed collection sits in the bucket of its grade, weighted as a CS2 weapon case', () => {
    const grades = readJson('gradeMap.json');

    for (const id of COLLECTION_IDS) {
        const caseDef = allCases[id];
        const weights = Object.fromEntries(Object.entries(caseDef.CHANCES).filter(([key]) => key !== 'COLORS'));
        assert.deepStrictEqual(weights, {
            milspec: 7992, restricted: 1598, classified: 320, covert: 64, special: 26,
        }, id);
        caseDef.ITEMS.forEach((item) => assert.strictEqual(grades[item.id], item.rare, `${id}: item ${item.id}`));
    }
});

test('_all.js registers all 74 cases in catalogue order and generation reports each one', () => {
    const entries = catalogue();
    assert.strictEqual(entries.length, 74);
    assert.deepStrictEqual(Object.keys(allCases), entries.map(({ id }) => id));
    const { summary } = generated();
    assert.strictEqual(summary.length, 74);
    summary.forEach((line, i) => assert.ok(line.startsWith(`  ✓ ${entries[i].id} [`), line));
});

test('the 38 collection prices remain unchanged', () => {
    const prices = readJson('casePrices.json');
    assert.deepStrictEqual(Object.fromEntries(COLLECTION_IDS.map((id) => [id, prices[id]])), {
        bomj: 62,
        havoc: 1138,
        cobblestone: 1402,
        'chop-shop': 62,
        train: 288,
        alpha: 309,
        'nuke-op': 297,
        'st-marc': 300,
        lake: 268,
        baggage: 295,
        bank: 331,
        'gods-monster': 6856,
        'mirage-op': 399,
        cache: 380,
        norse: 310,
        sportfield: 327,
        'inferno-op': 317,
        anubis: 1215,
        'dust2-op': 256,
        'rising-sun': 436,
        safehouse: 294,
        ancient: 693,
        italy: 345,
        graphic: 277,
        overpass: 1346,
        nuke: 435,
        'vertigo-2021': 238,
        control: 5471,
        'dust2-2021': 383,
        'mirage-2021': 356,
        dust2: 414,
        'overpass-old': 56,
        'inferno-old': 76,
        'vertigo-old': 60,
        velocity: 60,
        victory: 56,
        vindicator: 52,
        zephyr: 57,
    });
});

test('every weapon case holds exactly the non-knife skins of its weapon folder in value order', () => {
    const pool = committedPool();
    for (const entry of WEAPON_CASES) {
        const expected = pool.filter(({ weapon, grade }) => weapon === entry.title && grade !== GRADE.SPECIAL);
        assert.deepStrictEqual(caseFor(entry).ITEMS.map(({ id }) => id), expected.map(({ itemId }) => itemId), entry.id);
    }
});

test('every knife case holds exactly its knife skins in one special bucket and costs their mean value over the house return', () => {
    const pool = committedPool();
    const prices = readJson('casePrices.json');
    for (const entry of KNIFE_CASES) {
        const expected = pool.filter(({ weapon, grade }) => weapon === entry.title && grade === GRADE.SPECIAL);
        const caseDef = caseFor(entry);
        assert.deepStrictEqual(caseDef.ITEMS.map(({ id }) => id), expected.map(({ itemId }) => itemId), entry.id);
        const weights = Object.fromEntries(Object.entries(caseDef.CHANCES).filter(([key]) => key !== 'COLORS'));
        assert.deepStrictEqual(weights, { [GRADE.SPECIAL]: 1 }, entry.id);
        assert.ok(caseDef.ITEMS.every(({ rare }) => rare === GRADE.SPECIAL), entry.id);
        const mean = expected.reduce((sum, { value }) => sum + value, 0) / expected.length;
        assert.strictEqual(prices[entry.id], Math.round(mean / HOUSE_RETURN), entry.id);
    }
});

test('every rarity case holds 40 distinct items of its grade including the cheapest', () => {
    const pool = committedPool();
    const grades = readJson('gradeMap.json');
    for (const entry of GRADE_CASES) {
        const caseDef = caseFor(entry);
        assert.strictEqual(caseDef.ITEMS.length, 40, entry.id);
        assert.strictEqual(new Set(caseDef.ITEMS.map(({ id }) => id)).size, 40, entry.id);
        caseDef.ITEMS.forEach(({ id }) => assert.strictEqual(grades[id], entry.grade, `${entry.id}: item ${id}`));
        assert.strictEqual(caseDef.ITEMS[0].id, pool.find(({ grade }) => grade === entry.grade).itemId, entry.id);
    }
});

test('knife-chance cases share 15 knives and six restricted fillers and assign exactly their advertised knife weight', () => {
    const grades = readJson('gradeMap.json');
    for (const entry of KNIFE_CHANCE_CASES) {
        const caseDef = caseFor(entry);
        const knives = caseDef.ITEMS.filter(({ id }) => grades[id] === GRADE.SPECIAL);
        const fillers = caseDef.ITEMS.filter(({ id }) => grades[id] === GRADE.RESTRICTED);
        assert.strictEqual(caseDef.ITEMS.length, 21, entry.id);
        assert.strictEqual(knives.length, 15, entry.id);
        assert.strictEqual(fillers.length, 6, entry.id);
        assert.strictEqual(knives.reduce((sum, { rare }) => sum + caseDef.CHANCES[rare], 0), entry.share * TOTAL_WEIGHT, entry.id);
        assert.strictEqual(fillers.reduce((sum, { rare }) => sum + caseDef.CHANCES[rare], 0), (1 - entry.share) * TOTAL_WEIGHT, entry.id);
        assert.deepStrictEqual(caseDef.ITEMS, caseFor(KNIFE_CHANCE_CASES[0]).ITEMS, entry.id);
    }
});

test('every value-weighted case has positive integer item buckets totalling 10000000 and returns between 84 and 86 percent', () => {
    const valuesById = new Map(committedPool().map(({ itemId, value }) => [itemId, value]));
    const prices = readJson('casePrices.json');
    for (const entry of [...WEAPON_CASES, ...GRADE_CASES, ...KNIFE_CHANCE_CASES]) {
        const caseDef = caseFor(entry);
        const weights = Object.fromEntries(Object.entries(caseDef.CHANCES).filter(([key]) => key !== 'COLORS'));
        assert.deepStrictEqual(Object.keys(weights), caseDef.ITEMS.map(({ id }) => `item-${id}`), entry.id);
        caseDef.ITEMS.forEach(({ id, rare }) => assert.strictEqual(rare, `item-${id}`, entry.id));
        assert.ok(Object.values(weights).every((weight) => Number.isInteger(weight) && weight >= 1), entry.id);
        assert.strictEqual(Object.values(weights).reduce((sum, weight) => sum + weight, 0), TOTAL_WEIGHT, entry.id);
        const back = realisedReturn(
            caseDef.ITEMS.map(({ id }) => valuesById.get(id)),
            caseDef.ITEMS.map(({ rare }) => weights[rare]),
            prices[entry.id],
        );
        assert.ok(back >= 0.84 && back <= 0.86, `${entry.id}: return ${back}`);
    }
});

test('every new case with a catalogue target is priced at that target', () => {
    const prices = readJson('casePrices.json');
    for (const entry of catalogue().filter(({ target }) => target !== undefined)) {
        assert.strictEqual(prices[entry.id], entry.target, entry.id);
    }
});

test('every new case keeps the default and painted colour configuration', () => {
    for (const entry of catalogue().filter(({ family }) => family !== 'collection')) {
        const caseDef = caseFor(entry);
        assert.deepStrictEqual(caseDef.CHANCES.COLORS, {
            DEFAULT: 90, PAINTED: 10, LIST: { [COLORS.DEFAULT]: 50, [COLORS.PAINTED]: 50 },
        }, entry.id);
        caseDef.ITEMS.forEach(({ colors }) => assert.deepStrictEqual(colors, [COLORS.DEFAULT, COLORS.PAINTED], entry.id));
    }
});

test('generation uses the supplied manifest for new weapon folders while leaving collections unchanged', () => {
    const item = committedPool().filter(({ weapon }) => weapon === 'AK-47').at(-1);
    const [imagePath] = Object.entries(manifest).find(([, id]) => id === item.itemId);
    const renamed = { ...manifest };
    delete renamed[imagePath];
    renamed[`Rifles/Unlisted weapon/${imagePath.split('/').at(-1)}`] = item.itemId;
    const original = generated();
    const changed = generated(renamed);
    const itemLine = new RegExp(`\\bid: ${item.itemId},`);
    assert.match(original.files['ak-47.js'], itemLine);
    assert.doesNotMatch(changed.files['ak-47.js'], itemLine);
    const aliases = { 'st-marc': 'stmarc', 'rising-sun': 'risingsun' };
    for (const id of COLLECTION_IDS) {
        const filename = `${aliases[id] || id}.js`;
        assert.strictEqual(changed.files[filename], original.files[filename], id);
        assert.strictEqual(changed.casePrices[id], original.casePrices[id], id);
    }
});
