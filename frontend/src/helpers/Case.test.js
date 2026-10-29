import { renderItemProp, itemCaption } from './Case';

const t = (key, options) => (options ? `${key} ${JSON.stringify(options)}` : key);

const ak = {
    item_itemId: 7,
    item_name: 'AK-47 | Redline',
    item_type: 'rifles',
    item_rare: 'Field Tested',
    item_colors: 'default',
    item_grade: 'classified',
};

test('the colour shown is the colour that dropped, not the colour stored with the item', () => {
    expect(renderItemProp(ak, 'painted', t))
        .toBe('item.name: AK-47 | Redline, item.type: rifles, item.rarity: grade.classified, item.wear: Field Tested, item.color: painted');
    expect(renderItemProp({ ...ak, item_colors: 'painted' }, 'default', t))
        .toBe('item.name: AK-47 | Redline, item.type: rifles, item.rarity: grade.classified, item.wear: Field Tested, item.color: default');
});

test('without a dropped colour no colour is shown', () => {
    expect(renderItemProp({ ...ak, item_colors: 'painted' }, null, t))
        .toBe('item.name: AK-47 | Redline, item.type: rifles, item.rarity: grade.classified, item.wear: Field Tested');
});

test('an item that has no name yet is named by its id and never shows "undefined"', () => {
    const tooltip = renderItemProp({
        item_itemId: 31, item_name: '', item_rare: '', item_type: '',
    }, 'default', t);

    expect(tooltip).toBe('item.name: item.placeholder {"id":"31"}, item.color: default');
    expect(tooltip).not.toMatch(/undefined/);
});

test('a placeholder from the item cache shows only what is known about it', () => {
    const tooltip = renderItemProp({
        item_itemId: 31, item_name: 'Предмет #31', item_rare: '', item_type: '', placeholder: 'failed',
    }, 'painted', t);

    expect(tooltip).toBe('item.name: Предмет #31, item.color: painted');
});

test('nothing is shown for an item that is not loaded', () => {
    expect(renderItemProp(undefined, 'default', t)).toBe('');
});

test('an item whose grade is not known yet shows its wear but no rarity', () => {
    expect(renderItemProp({ ...ak, item_grade: null }, null, t))
        .toBe('item.name: AK-47 | Redline, item.type: rifles, item.wear: Field Tested');
});

test('a caption names the grade, then the wear and the type', () => {
    expect(itemCaption({ grade: 'covert', wear: 'Field Tested', type: 'rifles' }, t)).toBe('grade.covert · Field Tested rifles');
});

test('a caption leaves out what is not known', () => {
    expect(itemCaption({ grade: null, wear: 'Field Tested', type: 'rifles' }, t)).toBe('Field Tested rifles');
    expect(itemCaption({ grade: 'special', wear: '', type: undefined }, t)).toBe('grade.special');
    expect(itemCaption({}, t)).toBe('');
});

test('a chance, when given, closes the item details', () => {
    expect(renderItemProp(ak, null, t, '9,17%'))
        .toBe('item.name: AK-47 | Redline, item.type: rifles, item.rarity: grade.classified, item.wear: Field Tested, item.chance: 9,17%');
});
