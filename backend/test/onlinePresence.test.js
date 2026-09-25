const test = require('node:test');
const assert = require('node:assert');
const { resetTestDatabase } = require('./helpers/db');
const { startChatServer, connectClient, settle } = require('./helpers/socketClient');

const stub = (relative, exports) => {
    const resolved = require.resolve(relative);
    require.cache[resolved] = {
        id: resolved, filename: resolved, loaded: true, exports,
    };
};

stub('../src/redis/manager', { getAllDataHashWithKey: async () => ({}) });
stub('../src/services/chat', { add: async () => {}, get: async () => [] });

let activeSequelize;
let activeIo;
const clients = [];

test.after(async () => {
    await Promise.all(clients.map((c) => c.close()));
    if (activeIo) {
        await new Promise((resolve) => activeIo.close(() => resolve()));
    }
    if (activeSequelize) {
        await activeSequelize.close();
    }
});

const respond = (handler, req) => new Promise((resolve) => {
    const res = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(payload) { resolve({ code: this.statusCode, payload: JSON.parse(JSON.stringify(payload)) }); },
    };
    handler(req, res);
});

const online = async () => {
    const StatsController = require('../src/controllers/stats');
    const { code, payload } = await respond(StatsController.getSiteStats, {});
    assert.strictEqual(code, 200, JSON.stringify(payload));
    return payload.data;
};

test('the online count comes from live sockets: each player once across tabs, plus anonymous visitors', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await sequelize.query(
        "INSERT INTO users (login, password, email, balance, `rank`, role, avatar, created_at, updated_at) VALUES "
        + "('alice', 'x', 'alice@e.ua', 500, 0, 1, 3, NOW() - INTERVAL 1 DAY, NOW() - INTERVAL 1 DAY), "
        + "('bob', 'x', 'bob@e.ua', 500, 0, 1, 4, NOW() - INTERVAL 1 DAY, NOW() - INTERVAL 1 DAY), "
        + "('newcomer', 'x', 'new@e.ua', 500, 0, 1, 5, NOW(), NOW())",
    );

    const chat = require('../src/socket/chat');
    const { signToken } = require('../src/auth/token');
    const { port } = await startChatServer(chat);
    activeIo = chat.getIo();
    const connect = async (id) => {
        const client = await connectClient(port, id ? signToken({ user_id: id, user_tokenVersion: 0 }) : null);
        clients.push(client);
        return client;
    };

    assert.deepStrictEqual(await online().then(({ onlineUser, onlineUserList }) => ({ onlineUser, onlineUserList })), {
        onlineUser: 0,
        onlineUserList: [],
    }, 'a player who registered a minute ago but has no page open is not online');

    const aliceTab = await connect(1);
    const aliceOtherTab = await connect(1);
    await connect(2);
    const visitor = await connect(null);
    await connect(null);

    const busy = await online();
    assert.strictEqual(busy.onlineUser, 4, 'alice once for two tabs, bob, and two anonymous visitors');
    assert.deepStrictEqual(busy.onlineUserList.map((u) => u.user_login).sort(), ['alice', 'bob']);
    const alice = busy.onlineUserList.find((u) => u.user_login === 'alice');
    assert.deepStrictEqual(
        { user_id: alice.user_id, user_avatar: alice.user_avatar, user_role: alice.user_role },
        { user_id: 1, user_avatar: 3, user_role: 1 },
    );
    for (const user of busy.onlineUserList) {
        for (const secret of ['user_balance', 'user_email', 'user_password', 'user_tokenVersion']) {
            assert.ok(!(secret in user), `${secret} leaked into the public online list`);
        }
    }

    await aliceTab.close();
    await settle();
    assert.strictEqual((await online()).onlineUser, 4, 'alice is still online in her other tab');

    await aliceOtherTab.close();
    await visitor.close();
    await settle();
    const quiet = await online();
    assert.strictEqual(quiet.onlineUser, 2);
    assert.deepStrictEqual(quiet.onlineUserList.map((u) => u.user_login), ['bob']);
});
