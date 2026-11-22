const test = require('node:test');
const assert = require('node:assert/strict');
const { CASE_ID_PATTERN } = require('../../src/constant/caseId');
const manifest = require('../../src/constant/itemIds.json');
const {
    CATEGORIES, COLLECTION_IDS, COLLECTION_IMAGES, WEAPON_CASES, KNIFE_CASES,
    KNIFE_CHANCE_CASES, GRADE_CASES, catalogue,
} = require('./caseCatalog');

test('collection ids retain their original generator order', () => {
    assert.deepEqual(COLLECTION_IDS, [
        'bomj', 'havoc', 'cobblestone', 'chop-shop', 'train', 'alpha', 'nuke-op', 'st-marc',
        'lake', 'baggage', 'bank', 'gods-monster', 'mirage-op', 'cache', 'norse', 'sportfield',
        'inferno-op', 'anubis', 'dust2-op', 'rising-sun', 'safehouse', 'ancient', 'italy',
        'graphic', 'overpass', 'nuke', 'vertigo-2021', 'control', 'dust2-2021', 'mirage-2021',
        'dust2', 'overpass-old', 'inferno-old', 'vertigo-old', 'velocity', 'victory',
        'vindicator', 'zephyr',
    ]);
});

test('collection images retain their original filenames and order with WebP extensions', () => {
    assert.deepEqual(Object.entries(COLLECTION_IMAGES), Object.entries({
        'bomj': 'case-victory.webp',
        'havoc': '12havoc.webp',
        'cobblestone': '12cobble.webp',
        'chop-shop': '12chop-shop.webp',
        'train': '12train.webp',
        'alpha': '12alpha.webp',
        'nuke-op': '12nuke.webp',
        'st-marc': '12st-marc.webp',
        'lake': '12lake.webp',
        'baggage': '12baggage.webp',
        'bank': '12bank.webp',
        'gods-monster': 'gods-of-monster1.webp',
        'mirage-op': '12mirage.webp',
        'cache': '12cache.webp',
        'norse': 'norse1.webp',
        'sportfield': 'SportField.webp',
        'inferno-op': '12inferno.webp',
        'anubis': 'anubis.webp',
        'dust2-op': '12dust2.webp',
        'rising-sun': '1rising-sun.webp',
        'safehouse': '12safehouse.webp',
        'ancient': 'anicent.webp',
        'italy': '12italy.webp',
        'graphic': 'graphic.webp',
        'overpass': '2024OverpassCollection.webp',
        'nuke': 'nuke-2.webp',
        'vertigo-2021': 'vertigo2021.webp',
        'control': 'control1.webp',
        'dust2-2021': 'dust20211.webp',
        'mirage-2021': 'mirage20211.webp',
        'dust2': 'dust2.webp',
        'overpass-old': 'overpass1.webp',
        'inferno-old': 'inferno-old.webp',
        'vertigo-old': 'vertigo-old.webp',
        'velocity': 'case-velocity.webp',
        'victory': 'case-victory.webp',
        'vindicator': 'case-vindicator.webp',
        'zephyr': 'case-zephyr.webp',
    }));
});

test('the catalogue contains 74 distinct valid ids in collection, weapon, grade, chance and knife order', () => {
    const entries = catalogue();
    assert.equal(entries.length, 74);
    assert.equal(new Set(entries.map(({ id }) => id)).size, 74);
    entries.forEach(({ id }) => assert.match(id, CASE_ID_PATTERN));
    assert.deepEqual(entries.map(({ id }) => id), [
        ...COLLECTION_IDS,
        ...[WEAPON_CASES, GRADE_CASES, KNIFE_CHANCE_CASES, KNIFE_CASES].flat().map(({ id }) => id),
    ]);
    assert.deepEqual(entries.map(({ family }) => family), [
        ...Array(38).fill('collection'), ...Array(20).fill('weapon'), ...Array(5).fill('grade'),
        ...Array(3).fill('knife-chance'), ...Array(8).fill('knife'),
    ]);
});

test('categories have the approved ids, slugs, titles and priorities', () => {
    assert.deepEqual(CATEGORIES, [
        { id: 4, slug: 'weapons', title: 'Weapon Cases', priority: 100 },
        { id: 5, slug: 'grades', title: 'By Rarity', priority: 90 },
        { id: 6, slug: 'knife-chance', title: 'Knife Chance', priority: 80 },
        { id: 7, slug: 'knives', title: 'Knife Cases', priority: 70 },
        { id: 1, slug: 'collections', title: 'CS2 Collections', priority: 60 },
    ]);
    const slugs = new Set(CATEGORIES.map(({ slug }) => slug));
    catalogue().forEach(({ category }) => assert.ok(slugs.has(category), category));
});

test('collections retain their titles, image names and limits', () => {
    assert.deepEqual(catalogue().slice(0, 38), COLLECTION_IDS.map((id) => ({
        id,
        family: 'collection',
        title: id.toUpperCase(),
        category: 'collections',
        image: `/img/case/${COLLECTION_IMAGES[id]}`,
        openLimit: 1000,
    })));
});

test('new catalogue entries keep their family data, category and WebP image with no open limit', () => {
    for (const [entries, family, category] of [
        [WEAPON_CASES, 'weapon', 'weapons'], [GRADE_CASES, 'grade', 'grades'],
        [KNIFE_CHANCE_CASES, 'knife-chance', 'knife-chance'], [KNIFE_CASES, 'knife', 'knives'],
    ]) {
        assert.deepEqual(catalogue().filter((entry) => entry.family === family), entries.map((entry) => ({
            ...entry, family, category, image: `/img/case/${entry.id}.webp`, openLimit: -1,
        })));
    }
});

test('the four new families use the approved titles, targets, grades and knife shares', () => {
    assert.deepEqual(WEAPON_CASES.map(({ id, title, target }) => [id, title, target]), [
        ['ak-47', 'AK-47', 125], ['awp', 'AWP', 58], ['m4a4', 'M4A4', 84], ['m4a1-s', 'M4A1-S', 32],
        ['desert-eagle', 'Desert Eagle', 58], ['usp-s', 'USP-S', 58], ['glock-18', 'Glock-18', 58],
        ['p250', 'P250', 31], ['five-seven', 'Five-SeveN', 31], ['cz75-auto', 'CZ75-Auto', 29],
        ['tec-9', 'Tec-9', 17], ['mac-10', 'MAC-10', 10], ['mp9', 'MP9', 10], ['ump-45', 'UMP-45', 18],
        ['p90', 'P90', 25], ['famas', 'FAMAS', 18], ['galil-ar', 'Galil AR', 7], ['ssg-08', 'SSG 08', 26],
        ['aug', 'AUG', 5], ['sg-553', 'SG 553', 6],
    ]);
    assert.deepEqual(GRADE_CASES.map(({ id, title, grade, target }) => [id, title, grade, target]), [
        ['grade-milspec', 'MIL-SPEC', 'milspec', 13], ['grade-restricted', 'RESTRICTED', 'restricted', 67],
        ['grade-classified', 'CLASSIFIED', 'classified', 254], ['grade-covert', 'COVERT', 'covert', 2589],
        ['grade-knife', 'KNIFE', 'special', 10670],
    ]);
    assert.deepEqual(KNIFE_CHANCE_CASES, [
        { id: 'knife-1', title: 'KNIFE 1%', share: 0.01 },
        { id: 'knife-3', title: 'KNIFE 3%', share: 0.03, target: 1294 },
        { id: 'knife-5', title: 'KNIFE 5%', share: 0.05 },
    ]);
    assert.deepEqual(KNIFE_CASES.map(({ id, title }) => [id, title]), [
        ['karambit', 'Karambit'], ['butterfly-knife', 'Butterfly Knife'], ['m9-bayonet', 'M9 Bayonet'],
        ['bayonet', 'Bayonet'], ['flip-knife', 'Flip Knife'], ['talon-knife', 'Talon Knife'],
        ['huntsman-knife', 'Huntsman Knife'], ['gut-knife', 'Gut Knife'],
    ]);
});

test('every weapon and knife title is an existing manifest folder name', () => {
    const folders = new Set(Object.keys(manifest).map((imagePath) => imagePath.split('/')[1]));
    [...WEAPON_CASES, ...KNIFE_CASES].forEach(({ title }) => assert.ok(folders.has(title), title));
});
