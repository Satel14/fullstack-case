const test = require('node:test');
const assert = require('node:assert');

const GRADES = ['covert', 'classified', 'restricted'];

const stubItemCache = (caseDef) => {
    const itemHash = {};
    caseDef.ITEMS.forEach((item, i) => {
        itemHash[item.id] = JSON.stringify({
            name: `Item ${item.id}`,
            type: 'rifles',
            rare: item.rare,
            grade: GRADES[i % GRADES.length],
            item_imagePath: `/img/${item.id}.png`,
            pricesInCredits: JSON.stringify({ default: 10 + i, painted: 20 + i }),
        });
    });
    const managerPath = require.resolve('../src/redis/manager');
    require.cache[managerPath] = {
        id: managerPath,
        filename: managerPath,
        loaded: true,
        exports: { getAllDataHashWithKey: async () => itemHash },
    };
    return itemHash;
};

test('every tile of the roulette strip and the winner carry their item\'s grade', async () => {
    const allCases = require('../src/constant/cases/_all');
    const itemHash = stubItemCache(allCases.dust2);
    const OpenCase = require('../src/modules/caseOpen');
    const winnerItem = allCases.dust2.ITEMS[0];

    const result = await new OpenCase().openCase('dust2', { itemId: winnerItem.id, color: 'default' });

    assert.ok(result.resultWithItem.length > 0);
    result.resultWithItem.forEach((tile) => assert.strictEqual(tile.grade, JSON.parse(itemHash[tile.id]).grade, `tile ${tile.id}`));
    assert.strictEqual(result.winner.item.grade, 'covert');
});
