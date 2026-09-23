const test = require('node:test');
const assert = require('node:assert');
const express = require('express');
const { resetTestDatabase } = require('./helpers/db');

let activeSequelize;

test.after(async () => {
    if (activeSequelize) {
        await activeSequelize.close();
    }
});

const managerPath = require.resolve('../src/redis/manager');
require.cache[managerPath] = {
    id: managerPath, filename: managerPath, loaded: true, exports: { getAllDataHashWithKey: async () => ({}) },
};

const limiters = require('../src/middleware/rateLimiters');

const LIMITER_NAMES = new Map(Object.entries(limiters).map(([name, handle]) => [handle, name]));
const isLimiter = (guard) => Object.prototype.hasOwnProperty.call(limiters, guard);

const WRITE_ROUTES_WITHOUT_MONEY = [
    'PUT /api/profile/edit',
    'PUT /api/profile/provably-fair/client-seed',
    'POST /api/provably-fair/verify',
    'POST /api/profile/storage',
];

const PER_USER_LIMITERS = {
    'PUT /api/promocode/use': 'promocodeLimiter',
    'PUT /api/profile/sendmoney': 'transferLimiter',
    'PUT /api/storage/sell/:id': 'sellLimiter',
    'PUT /api/storage/receive/:id': 'receiveLimiter',
};

const collectWriteRoutes = (stack) => stack.flatMap((layer) => {
    if (layer.route) {
        return Object.keys(layer.route.methods)
            .filter((method) => method === 'put' || method === 'post')
            .map((method) => ({
                key: `${method.toUpperCase()} ${layer.route.path}`,
                guards: layer.route.stack.map((s) => LIMITER_NAMES.get(s.handle) || s.name),
            }));
    }
    if (layer.handle && layer.handle.stack) {
        return collectWriteRoutes(layer.handle.stack);
    }
    return [];
});

const writeRoutes = () => {
    const app = express();
    require('../routes')(app);
    return collectWriteRoutes(app._router.stack);
};

test('every PUT and POST route that moves money or items carries a rate limiter', () => {
    const routes = writeRoutes();
    const keys = routes.map((r) => r.key);

    for (const exempt of WRITE_ROUTES_WITHOUT_MONEY) {
        assert.ok(keys.includes(exempt), `${exempt} is exempted but no longer registered`);
    }

    const unlimited = routes
        .filter((r) => !WRITE_ROUTES_WITHOUT_MONEY.includes(r.key))
        .filter((r) => !r.guards.some(isLimiter))
        .map((r) => `${r.key} (guards: ${r.guards.join(', ')})`);

    assert.deepStrictEqual(unlimited, [], 'attach a limiter from middleware/rateLimiters, or list the route as moving no money');
});

test('the per-user limiters run after authenticate on their routes', () => {
    const routes = new Map(writeRoutes().map((r) => [r.key, r.guards]));

    for (const [key, limiterName] of Object.entries(PER_USER_LIMITERS)) {
        const guards = routes.get(key);
        assert.ok(guards, `${key} is not registered`);
        const limiterAt = guards.indexOf(limiterName);
        const authAt = guards.indexOf('authenticate');
        assert.ok(limiterAt !== -1, `${key} does not use ${limiterName} (guards: ${guards.join(', ')})`);
        assert.ok(authAt !== -1 && authAt < limiterAt, `${key} must run ${limiterName} after authenticate: ${guards.join(', ')}`);
    }
});

const serve = async (limiter) => {
    const app = express();
    app.set('trust proxy', true);
    app.put(
        '/probe',
        (req, res, next) => {
            req.user = { profile: { user_id: Number(req.get('x-test-user')) } };
            next();
        },
        limiter,
        (req, res) => res.status(200).json({ status: 200 }),
    );
    const server = await new Promise((resolve) => {
        const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    const url = `http://127.0.0.1:${server.address().port}/probe`;
    const send = async (userId, forwardedFor) => {
        const headers = { 'x-test-user': String(userId) };
        if (forwardedFor) {
            headers['x-forwarded-for'] = forwardedFor;
        }
        const response = await fetch(url, { method: 'PUT', headers });
        return { code: response.status, body: await response.json() };
    };
    const close = () => new Promise((resolve) => server.close(resolve));
    return { send, close };
};

const sendUntilLimited = async (send, userId, ceiling) => {
    for (let attempt = 1; attempt <= ceiling; attempt += 1) {
        const result = await send(userId, `203.0.113.${attempt % 250}`);
        if (result.code !== 200) {
            return { attempt, result };
        }
    }
    return null;
};

let nextUserId = 1000;
const freshUser = () => {
    nextUserId += 1;
    return nextUserId;
};

for (const [key, limiterName] of Object.entries(PER_USER_LIMITERS)) {
    test(`${limiterName} on ${key} counts per player, whatever address the requests come from`, async () => {
        const limiter = limiters[limiterName];
        assert.strictEqual(typeof limiter, 'function', `${limiterName} is not exported`);
        const { send, close } = await serve(limiter);
        try {
            const player = freshUser();
            const limited = await sendUntilLimited(send, player, 1000);

            assert.ok(limited, `${limiterName} never answered 429 in 1000 requests from one player`);
            assert.strictEqual(limited.result.code, 429);
            assert.strictEqual(limited.result.body.status, 429);
            assert.strictEqual(typeof limited.result.body.message, 'string');
            assert.ok(limited.result.body.message.length > 0);

            const rotated = await send(player, '198.51.100.77');
            assert.strictEqual(rotated.code, 429, 'a new X-Forwarded-For reset the player\'s bucket');

            const other = await send(freshUser(), '198.51.100.77');
            assert.strictEqual(other.code, 200, 'another player on the same address was blocked');
        } finally {
            await close();
        }
    });
}

test('promocode guessing is stopped within 20 attempts', async () => {
    const { send, close } = await serve(limiters.promocodeLimiter);
    try {
        const limited = await sendUntilLimited(send, freshUser(), 21);
        assert.ok(limited, 'one player could try 21 promocodes in a row');
    } finally {
        await close();
    }
});

test('a full Sell all in the inventory plus a sell-all after a 100-item open fit in the sell window', async () => {
    const INVENTORY_PAGE = 200;
    const LARGEST_OPEN = 100;
    const { send, close } = await serve(limiters.sellLimiter);
    try {
        const player = freshUser();
        for (let sale = 1; sale <= INVENTORY_PAGE + LARGEST_OPEN; sale += 1) {
            const result = await send(player);
            assert.strictEqual(result.code, 200, `sale ${sale} was refused: ${JSON.stringify(result.body)}`);
        }
    } finally {
        await close();
    }
});

test('the real promocode route limits a logged-in player by account and keeps serving the next one', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    await sequelize.query(
        "INSERT INTO users (login, password, email, balance, `rank`, role) VALUES "
        + "('guesser', 'x', 'guesser@e.ua', 0, 0, 1), ('bystander', 'x', 'bystander@e.ua', 0, 0, 1)",
    );
    const { signToken } = require('../src/auth/token');
    const MESSAGE = require('../src/constant/responseMessages');

    const app = express();
    app.use(express.json());
    require('../routes')(app);
    const server = await new Promise((resolve) => {
        const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    const url = `http://127.0.0.1:${server.address().port}/api/promocode/use`;
    const tryCode = async (userId, promocode) => {
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${signToken({ user_id: userId, user_tokenVersion: 0 })}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ promocode }),
        });
        return { code: response.status, limit: Number(response.headers.get('ratelimit-limit')), body: await response.json() };
    };

    try {
        const first = await tryCode(1, 'GUESS0');
        assert.strictEqual(first.code, 200);
        assert.strictEqual(first.body.message, MESSAGE.PROMOCODE.NOT_EXIST);
        assert.ok(first.limit > 0, 'the route sent no RateLimit-Limit header');

        for (let guess = 1; guess < first.limit; guess += 1) {
            const result = await tryCode(1, `GUESS${guess}`);
            assert.strictEqual(result.code, 200, `guess ${guess} was refused early`);
        }

        const blocked = await tryCode(1, 'GUESSLAST');
        assert.strictEqual(blocked.code, 429);
        assert.strictEqual(blocked.body.status, 429);

        const bystander = await tryCode(2, 'GUESS0');
        assert.strictEqual(bystander.code, 200);
        assert.strictEqual(bystander.body.message, MESSAGE.PROMOCODE.NOT_EXIST);
    } finally {
        await new Promise((resolve) => server.close(resolve));
    }
});
