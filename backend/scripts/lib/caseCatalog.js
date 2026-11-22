const { GRADE } = require('../../src/constant/itemConfigs');

const CATEGORIES = [
    { id: 4, slug: 'weapons', title: 'Weapon Cases', priority: 100 },
    { id: 5, slug: 'grades', title: 'By Rarity', priority: 90 },
    { id: 6, slug: 'knife-chance', title: 'Knife Chance', priority: 80 },
    { id: 7, slug: 'knives', title: 'Knife Cases', priority: 70 },
    { id: 1, slug: 'collections', title: 'CS2 Collections', priority: 60 },
];

const COLLECTION_IDS = [
    'bomj', 'havoc', 'cobblestone', 'chop-shop', 'train', 'alpha', 'nuke-op', 'st-marc',
    'lake', 'baggage', 'bank', 'gods-monster', 'mirage-op', 'cache', 'norse', 'sportfield',
    'inferno-op', 'anubis', 'dust2-op', 'rising-sun', 'safehouse', 'ancient', 'italy',
    'graphic', 'overpass', 'nuke', 'vertigo-2021', 'control', 'dust2-2021', 'mirage-2021',
    'dust2', 'overpass-old', 'inferno-old', 'vertigo-old', 'velocity', 'victory',
    'vindicator', 'zephyr',
];

const COLLECTION_IMAGES = {
    'bomj': 'case-victory.png',
    'havoc': '12havoc.png',
    'cobblestone': '12cobble.png',
    'chop-shop': '12chop-shop.png',
    'train': '12train.png',
    'alpha': '12alpha.png',
    'nuke-op': '12nuke.png',
    'st-marc': '12st-marc.png',
    'lake': '12lake.png',
    'baggage': '12baggage.png',
    'bank': '12bank.png',
    'gods-monster': 'gods-of-monster1.png',
    'mirage-op': '12mirage.png',
    'cache': '12cache.png',
    'norse': 'norse1.png',
    'sportfield': 'SportField.png',
    'inferno-op': '12inferno.png',
    'anubis': 'anubis.png',
    'dust2-op': '12dust2.png',
    'rising-sun': '1rising-sun.png',
    'safehouse': '12safehouse.png',
    'ancient': 'anicent.png',
    'italy': '12italy.png',
    'graphic': 'graphic.png',
    'overpass': '2024OverpassCollection.png',
    'nuke': 'nuke-2.png',
    'vertigo-2021': 'vertigo2021.png',
    'control': 'control1.png',
    'dust2-2021': 'dust20211.png',
    'mirage-2021': 'mirage20211.png',
    'dust2': 'dust2.png',
    'overpass-old': 'overpass1.png',
    'inferno-old': 'inferno-old.png',
    'vertigo-old': 'vertigo-old.png',
    'velocity': 'case-velocity.png',
    'victory': 'case-victory.png',
    'vindicator': 'case-vindicator.png',
    'zephyr': 'case-zephyr.png',
};

const WEAPON_CASES = [
    { id: 'ak-47', title: 'AK-47', target: 125 },
    { id: 'awp', title: 'AWP', target: 58 },
    { id: 'm4a4', title: 'M4A4', target: 84 },
    { id: 'm4a1-s', title: 'M4A1-S', target: 32 },
    { id: 'desert-eagle', title: 'Desert Eagle', target: 58 },
    { id: 'usp-s', title: 'USP-S', target: 58 },
    { id: 'glock-18', title: 'Glock-18', target: 58 },
    { id: 'p250', title: 'P250', target: 31 },
    { id: 'five-seven', title: 'Five-SeveN', target: 31 },
    { id: 'cz75-auto', title: 'CZ75-Auto', target: 29 },
    { id: 'tec-9', title: 'Tec-9', target: 17 },
    { id: 'mac-10', title: 'MAC-10', target: 10 },
    { id: 'mp9', title: 'MP9', target: 10 },
    { id: 'ump-45', title: 'UMP-45', target: 18 },
    { id: 'p90', title: 'P90', target: 25 },
    { id: 'famas', title: 'FAMAS', target: 18 },
    { id: 'galil-ar', title: 'Galil AR', target: 7 },
    { id: 'ssg-08', title: 'SSG 08', target: 26 },
    { id: 'aug', title: 'AUG', target: 5 },
    { id: 'sg-553', title: 'SG 553', target: 6 },
];

const GRADE_CASES = [
    { id: 'grade-milspec', title: 'MIL-SPEC', grade: GRADE.MILSPEC, target: 13 },
    { id: 'grade-restricted', title: 'RESTRICTED', grade: GRADE.RESTRICTED, target: 67 },
    { id: 'grade-classified', title: 'CLASSIFIED', grade: GRADE.CLASSIFIED, target: 254 },
    { id: 'grade-covert', title: 'COVERT', grade: GRADE.COVERT, target: 2589 },
    { id: 'grade-knife', title: 'KNIFE', grade: GRADE.SPECIAL, target: 10670 },
];

const KNIFE_CHANCE_CASES = [
    { id: 'knife-1', title: 'KNIFE 1%', share: 0.01 },
    { id: 'knife-3', title: 'KNIFE 3%', share: 0.03, target: 1294 },
    { id: 'knife-5', title: 'KNIFE 5%', share: 0.05 },
];

const KNIFE_CASES = [
    { id: 'karambit', title: 'Karambit' },
    { id: 'butterfly-knife', title: 'Butterfly Knife' },
    { id: 'm9-bayonet', title: 'M9 Bayonet' },
    { id: 'bayonet', title: 'Bayonet' },
    { id: 'flip-knife', title: 'Flip Knife' },
    { id: 'talon-knife', title: 'Talon Knife' },
    { id: 'huntsman-knife', title: 'Huntsman Knife' },
    { id: 'gut-knife', title: 'Gut Knife' },
];

const familyEntries = (entries, family, category) => entries.map((entry) => ({
    ...entry, family, category, image: `/img/case/${entry.id}.webp`, openLimit: -1,
}));

const catalogue = () => [
    ...COLLECTION_IDS.map((id) => ({
        id,
        family: 'collection',
        title: id.toUpperCase(),
        category: 'collections',
        image: `/img/case/${COLLECTION_IMAGES[id]}`,
        openLimit: 1000,
    })),
    ...familyEntries(WEAPON_CASES, 'weapon', 'weapons'),
    ...familyEntries(GRADE_CASES, 'grade', 'grades'),
    ...familyEntries(KNIFE_CHANCE_CASES, 'knife-chance', 'knife-chance'),
    ...familyEntries(KNIFE_CASES, 'knife', 'knives'),
];

module.exports = {
    CATEGORIES, COLLECTION_IDS, COLLECTION_IMAGES, WEAPON_CASES, KNIFE_CASES,
    KNIFE_CHANCE_CASES, GRADE_CASES, catalogue,
};
