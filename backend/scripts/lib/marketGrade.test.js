const test = require('node:test');
const assert = require('node:assert/strict');
const {
    GRADES, gradeOfColor, skinKey, gradesBySkin, gradeItems, serializeGradeMap, withGrades,
} = require('./marketGrade');
const ITEMS = require('../../src/constant/itemConfigs');

test('the grades run from the most common to the rarest', () => {
    assert.deepEqual(GRADES, ['consumer', 'industrial', 'milspec', 'restricted', 'classified', 'covert', 'contraband', 'special']);
});

test('gradeOfColor reads the seven CS2 grade colours in any case and nothing else', () => {
    assert.equal(gradeOfColor('b0c3d9'), 'consumer');
    assert.equal(gradeOfColor('5E98D9'), 'industrial');
    assert.equal(gradeOfColor('4b69ff'), 'milspec');
    assert.equal(gradeOfColor('8847ff'), 'restricted');
    assert.equal(gradeOfColor('d32ce6'), 'classified');
    assert.equal(gradeOfColor('EB4B4B'), 'covert');
    assert.equal(gradeOfColor('e4ae39'), 'contraband');
    assert.equal(gradeOfColor('d2d2d2'), null);
    assert.equal(gradeOfColor(''), null);
    assert.equal(gradeOfColor(undefined), null);
});

test('skinKey drops the wear, StatTrak and Souvenir but keeps the knife star', () => {
    assert.equal(skinKey('AK-47 | Redline (Field-Tested)'), 'AK-47 | Redline');
    assert.equal(skinKey('StatTrak™ AK-47 | Redline (Minimal Wear)'), 'AK-47 | Redline');
    assert.equal(skinKey('Souvenir AWP | Dragon Lore (Factory New)'), 'AWP | Dragon Lore');
    assert.equal(skinKey('★ StatTrak™ Bayonet | Fade (Factory New)'), '★ Bayonet | Fade');
    assert.equal(skinKey('★ Bayonet | Doppler (Battle-Scarred)'), '★ Bayonet | Doppler');
    assert.equal(skinKey('Operation Payback Pass'), 'Operation Payback Pass');
});

test('gradesBySkin takes the colour most listings of a skin carry and ignores colours that are no grade', () => {
    const skins = gradesBySkin([
        { market_hash_name: 'AK-47 | Redline (Field-Tested)', text_color: '8847ff' },
        { market_hash_name: 'StatTrak™ AK-47 | Redline (Well-Worn)', text_color: '8847FF' },
        { market_hash_name: 'AK-47 | Redline (Minimal Wear)', text_color: 'd32ce6' },
        { market_hash_name: 'AK-47 | Redline (Battle-Scarred)', text_color: 'd2d2d2' },
        { market_hash_name: 'Operation Payback Pass', text_color: 'D2D2D2' },
    ]);

    assert.equal(skins.get('AK-47 | Redline'), 'restricted');
    assert.equal(skins.has('Operation Payback Pass'), false);
});

test('gradeItems marks real knives special, grades the rest by their skin and lists what it cannot find', () => {
    const skins = new Map([
        ['★ Bayonet | Fade', 'covert'],
        ['Zeus x27 | Olympus', 'classified'],
        ['AWP | POP AWP', 'restricted'],
        ['M249 | Aztec', 'consumer'],
    ]);
    const items = [
        { itemId: 1, name: 'M249 | Aztec', type: ITEMS.TYPE.MACHINE_GUNS },
        { itemId: 2, name: 'Bayonet | Fade', type: ITEMS.TYPE.KNIFE },
        { itemId: 3, name: 'Zeus x27 | Olympus', type: ITEMS.TYPE.KNIFE },
        { itemId: 4, name: 'AWP | POP', type: ITEMS.TYPE.SNIPER_RIFLES },
        { itemId: 5, name: 'Glock-18 | Nowhere', type: ITEMS.TYPE.PISTOLS },
    ];

    assert.deepEqual(gradeItems(items, skins), {
        grades: {
            1: 'consumer', 2: 'special', 3: 'classified', 4: 'restricted',
        },
        missing: ['5 Glock-18 | Nowhere'],
    });
});

test('serializeGradeMap writes one item per line in id order', () => {
    assert.equal(serializeGradeMap({ 10: 'covert', 2: 'consumer' }), '{\n"2":"consumer",\n"10":"covert"\n}\n');
});

test('withGrades puts the committed grade on every item', () => {
    assert.deepEqual(
        withGrades([{ itemId: 1, name: 'M249 | Aztec' }, { itemId: 2, name: 'Bayonet | Fade' }], { 1: 'restricted', 2: 'special' }),
        [{ itemId: 1, name: 'M249 | Aztec', grade: 'restricted' }, { itemId: 2, name: 'Bayonet | Fade', grade: 'special' }],
    );
});

test('withGrades refuses, naming them, items the grade map does not know', () => {
    assert.throws(
        () => withGrades([{ itemId: 1, name: 'M249 | Aztec' }, { itemId: 7, name: 'New | Skin' }], { 1: 'restricted' }),
        /1 items have no grade in scripts\/data\/gradeMap\.json: 7 New \| Skin\..*fetchMarketGrades/,
    );
});

test('gradesBySkin settles a tied vote on the rarer grade, whatever the listing order', () => {
    const listings = [
        { market_hash_name: 'AK-47 | Redline (Field-Tested)', text_color: '8847ff' },
        { market_hash_name: 'AK-47 | Redline (Minimal Wear)', text_color: 'd32ce6' },
    ];

    assert.equal(gradesBySkin(listings).get('AK-47 | Redline'), 'classified');
    assert.equal(gradesBySkin([...listings].reverse()).get('AK-47 | Redline'), 'classified');
});
