const { assertSafeTestDatabase } = require('./helpers/db');
const test = require('node:test');
const assert = require('node:assert');
const sequelize = require('../src/config/db');
const flush = () => new Promise((resolve) => setImmediate(resolve));

test.before(() => assertSafeTestDatabase());
test.after(() => sequelize.close());

const fakeTimers = (t) => {
    const pending = new Map();
    t.mock.method(global, 'setTimeout', (fn, ms) => {
        const timer = { unref() {} };
        pending.set(timer, { fn, ms });
        return timer;
    });
    t.mock.method(global, 'clearTimeout', (timer) => pending.delete(timer));
    return pending;
};

for (const name of ['withdrawal', 'emailVerification']) {
    test(`${name} stop waits for the active sweep and prevents rescheduling`, async (t) => {
        const service = require(`../src/services/${name}`);
        const timers = fakeTimers(t);
        const work = Promise.withResolvers();
        let calls = 0;
        const sweep = service.startSweep({ intervalMs: 5, run: () => { calls += 1; return work.promise; } });
        const stopped = sweep.stop();
        assert.ok(stopped && typeof stopped.then === 'function', 'stop must return the active sweep promise');
        let finished = false;
        stopped.then(() => { finished = true; });
        await flush();
        assert.strictEqual(finished, false);
        work.resolve();
        await stopped;
        assert.strictEqual(finished, true);
        assert.strictEqual(calls, 1);
        assert.strictEqual(timers.size, 0);
        assert.strictEqual(sweep.stop(), stopped);
    });

    test(`${name} stop cancels the next scheduled sweep`, async (t) => {
        const service = require(`../src/services/${name}`);
        const timers = fakeTimers(t);
        let calls = 0;
        const sweep = service.startSweep({ intervalMs: 5, run: async () => { calls += 1; } });
        await flush();
        assert.strictEqual(timers.size, 1);
        await sweep.stop();
        assert.strictEqual(timers.size, 0);
        assert.strictEqual(calls, 1);
    });

    test(`${name} stop waits for a failed run to be handled without leaving a timer`, async (t) => {
        const service = require(`../src/services/${name}`);
        const timers = fakeTimers(t);
        const work = Promise.withResolvers();
        const logged = [];
        t.mock.method(console, 'error', (...args) => logged.push(args));
        const sweep = service.startSweep({ intervalMs: 5, run: () => work.promise });
        const stopped = sweep.stop();
        assert.ok(stopped && typeof stopped.then === 'function');
        const error = Object.assign(new Error('query failed'), { sql: 'SECRET SQL', parameters: ['SECRET VALUE'] });
        work.reject(error);
        await stopped;
        assert.strictEqual(timers.size, 0);
        assert.strictEqual(logged.length, 1);
        assert.ok(logged[0].every((value) => typeof value === 'string'));
        assert.doesNotMatch(logged.flat().join(' '), /SECRET/);
    });
}
