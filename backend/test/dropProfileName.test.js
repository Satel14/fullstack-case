const { resetTestDatabase } = require('./helpers/db');
const test = require('node:test');
const assert = require('node:assert');

const emitted = [];
const stub = (relative, exports) => {
    const filename = require.resolve(relative);
    require.cache[filename] = { id: filename, filename, loaded: true, exports };
};

stub('../src/socket/chat', { getIo: () => ({ emit: (...args) => emitted.push(args) }) });
const caseDef = require('../src/constant/cases/_all').dust2;
const itemHash = Object.fromEntries(caseDef.ITEMS.map(({ id }) => [id, JSON.stringify({
    name: `Item ${id}`, pricesInCredits: JSON.stringify({ default: 10, painted: 20 }),
})]));
stub('../src/redis/manager', { getAllDataHashWithKey: async () => itemHash });

test('a live drop carries the public winner name so its profile link can be named', async () => {
    const sequelize = await resetTestDatabase();
    try {
        await sequelize.query(
            "INSERT INTO users (login, password, email, balance, `rank`, role) VALUES ('Alice', 'private-hash', 'private@example.com', 1000, 0, 1)",
        );
        await sequelize.query(
            "INSERT INTO cases (id, title, price, categoryId, published, openedCount, openLimit) VALUES ('dust2', 'DUST2', 100, 1, 1, 0, 100)",
        );
        const { openCaseById } = require('../src/controllers/case');
        const result = {};
        const res = {
            status(code) { result.code = code; return this; },
            json(payload) { result.payload = payload; return this; },
        };

        await openCaseById({
            body: { id: 'dust2', count: 1 },
            user: { profile: { user_id: 1, user_login: 'Alice', user_email: 'private@example.com' } },
        }, res);

        assert.strictEqual(result.code, 200);
        assert.ok(result.payload.data, JSON.stringify(result.payload));
        assert.strictEqual(emitted.length, 1);
        const [event, payload] = emitted[0];
        assert.strictEqual(event, 'new-drop');
        assert.strictEqual(payload.user_login, 'Alice');
        assert.strictEqual(payload.storage_userId, 1);
        assert.strictEqual(payload.storage_id, result.payload.data[0].winner.storageId);
        assert.strictEqual(payload.source, 'case');
        assert.deepStrictEqual(Object.keys(payload).sort(), [
            'storage_id', 'storage_itemId', 'storage_userId', 'storage_caseId', 'storage_color', 'user_login', 'source',
        ].sort());
    } finally {
        await sequelize.close();
    }
});
