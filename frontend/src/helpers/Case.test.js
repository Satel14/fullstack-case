import { renderItemProp } from './Case';

const t = (key, options) => (options ? `${key} ${JSON.stringify(options)}` : key);

const ak = {
    item_itemId: 7,
    item_name: 'AK-47 | Redline',
    item_type: 'rifles',
    item_rare: 'Field Tested',
    item_colors: 'default',
};

test('the colour shown is the colour that dropped, not the colour stored with the item', () => {
    expect(renderItemProp(ak, 'painted', t))
        .toBe('item.name: AK-47 | Redline, item.type: rifles, item.rarity: Field Tested, item.color: painted');
    expect(renderItemProp({ ...ak, item_colors: 'painted' }, 'default', t))
        .toBe('item.name: AK-47 | Redline, item.type: rifles, item.rarity: Field Tested, item.color: default');
});

test('without a dropped colour no colour is shown', () => {
    expect(renderItemProp({ ...ak, item_colors: 'painted' }, null, t))
        .toBe('item.name: AK-47 | Redline, item.type: rifles, item.rarity: Field Tested');
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
