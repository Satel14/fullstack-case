const test = require('node:test');
const assert = require('node:assert');
const { buildItemHash } = require('../src/redis/itemHash');

const item = (id, name, extra = {}) => ({
    item_itemId: id, item_name: name, item_rare: 'Factory New', item_type: 'rifles', item_imagePath: `/img/${id}.png`, ...extra,
});

test('each priced item becomes one cache entry in the shape the case opener reads', () => {
    const hash = buildItemHash(
        [item(1, 'AK-47 | Redline'), item(2, 'P250 | Sand Dune')],
        [{ name: 'AK-47 | Redline', pricesInCredits: '{"default":10,"painted":12}' }, { name: 'P250 | Sand Dune', pricesInCredits: '{"default":1}' }],
    );

    assert.deepStrictEqual(Object.keys(hash), ['1', '2']);
    assert.deepStrictEqual(JSON.parse(hash[1]), {
        name: 'AK-47 | Redline',
        rare: 'Factory New',
        type: 'rifles',
        item_imagePath: '/img/1.png',
        pricesInCredits: '{"default":10,"painted":12}',
    });
});

test('items without a name or without a price row are left out', () => {
    const hash = buildItemHash(
        [item(1, 'Priced'), item(2, null), item(3, 'Unpriced'), item(4, 'No field')],
        [{ name: 'Priced', pricesInCredits: '{}' }, { name: 'No field' }],
    );

    assert.deepStrictEqual(Object.keys(hash), ['1']);
});

test('when a name has several price rows the first one wins, as before', () => {
    const hash = buildItemHash(
        [item(1, 'Twice')],
        [{ name: 'Twice', pricesInCredits: 'first' }, { name: 'Twice', pricesInCredits: 'second' }],
    );

    assert.strictEqual(JSON.parse(hash[1]).pricesInCredits, 'first');
});
