const { isKnife } = require('./marketName');

const GRADES = ['consumer', 'industrial', 'milspec', 'restricted', 'classified', 'covert', 'contraband', 'special'];

const GRADE_COLORS = {
    b0c3d9: 'consumer',
    '5e98d9': 'industrial',
    '4b69ff': 'milspec',
    '8847ff': 'restricted',
    d32ce6: 'classified',
    eb4b4b: 'covert',
    e4ae39: 'contraband',
};

const MARKET_NAMES = {
    'AWP | POP': 'AWP | POP AWP',
};

const WEAR_SUFFIX = / \((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)$/;

const gradeOfColor = (color) => GRADE_COLORS[String(color || '').toLowerCase()] || null;

const skinKey = (marketHashName) => marketHashName
    .replace(WEAR_SUFFIX, '')
    .replace(/^(★ )?(StatTrak™ |Souvenir )/, '$1');

const gradesBySkin = (marketItems) => {
    const votes = new Map();
    for (const { market_hash_name: name, text_color: color } of marketItems) {
        const grade = gradeOfColor(color);
        if (grade) {
            const key = skinKey(name);
            const tally = votes.get(key) || {};
            tally[grade] = (tally[grade] || 0) + 1;
            votes.set(key, tally);
        }
    }
    const skins = new Map();
    for (const [key, tally] of votes) {
        skins.set(key, Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0]);
    }
    return skins;
};

const gradeOf = (item, skins) => {
    const name = MARKET_NAMES[item.name] || item.name;
    if (isKnife(item.type) && skins.has(`★ ${name}`)) {
        return 'special';
    }
    return skins.get(name) || null;
};

const gradeItems = (items, skins) => {
    const grades = {};
    const missing = [];
    for (const item of items) {
        const grade = gradeOf(item, skins);
        if (grade) {
            grades[item.itemId] = grade;
        } else {
            missing.push(`${item.itemId} ${item.name}`);
        }
    }
    return { grades, missing };
};

const serializeGradeMap = (grades) => {
    const lines = Object.keys(grades)
        .sort((a, b) => Number(a) - Number(b))
        .map((id) => `${JSON.stringify(id)}:${JSON.stringify(grades[id])}`);
    return `{\n${lines.join(',\n')}\n}\n`;
};

const withGrades = (items, gradeMap) => {
    const missing = items.filter((item) => !gradeMap[item.itemId]).map((item) => `${item.itemId} ${item.name}`);
    if (missing.length > 0) {
        throw new Error(
            `${missing.length} items have no grade in scripts/data/gradeMap.json: ${missing.join(', ')}. `
            + 'Run node scripts/fetchMarketGrades.js and commit the file before seeding.',
        );
    }
    return items.map((item) => ({ ...item, grade: gradeMap[item.itemId] }));
};

module.exports = {
    GRADES, GRADE_COLORS, gradeOfColor, skinKey, gradesBySkin, gradeItems, serializeGradeMap, withGrades,
};
