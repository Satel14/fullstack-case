const test = require('node:test');
const assert = require('node:assert');
const { createRateLimiter, createTrailingThrottle } = require('../src/socket/throttle');

const clock = () => {
    let at = 1000000;
    return { now: () => at, advance: (ms) => { at += ms; } };
};

test('the rate limiter allows a burst, then one more per refill interval, separately per key', () => {
    const time = clock();
    const limiter = createRateLimiter({ burst: 5, refillMs: 1000, now: time.now });

    const burst = Array.from({ length: 8 }, () => limiter.take('user:1'));
    assert.deepStrictEqual(burst, [true, true, true, true, true, false, false, false]);
    assert.strictEqual(limiter.take('user:2'), true, 'another player has an allowance of their own');

    time.advance(999);
    assert.strictEqual(limiter.take('user:1'), false);
    time.advance(1);
    assert.strictEqual(limiter.take('user:1'), true);
    assert.strictEqual(limiter.take('user:1'), false);

    time.advance(60000);
    assert.deepStrictEqual(
        Array.from({ length: 6 }, () => limiter.take('user:1')),
        [true, true, true, true, true, false],
        'a long pause restores the burst and no more',
    );
});

test('the rate limiter forgets keys whose allowance has fully refilled', () => {
    const time = clock();
    const limiter = createRateLimiter({ burst: 5, refillMs: 1000, now: time.now });

    for (let i = 0; i < 1000; i += 1) {
        limiter.take(`socket:${i}`);
    }
    assert.strictEqual(limiter.size(), 1000);

    time.advance(5000);
    limiter.take('socket:new');
    assert.strictEqual(limiter.size(), 1);
});

test('the trailing throttle runs at once, folds a burst into one later run, and can be cancelled', (t) => {
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 0 });
    let runs = 0;
    const call = createTrailingThrottle(() => { runs += 1; }, 1000);

    call();
    assert.strictEqual(runs, 1, 'the first call is answered at once');
    for (let i = 0; i < 50; i += 1) {
        call();
    }
    assert.strictEqual(runs, 1);

    t.mock.timers.tick(999);
    assert.strictEqual(runs, 1);
    t.mock.timers.tick(1);
    assert.strictEqual(runs, 2, 'the burst is answered once, when the interval is over');
    t.mock.timers.tick(5000);
    assert.strictEqual(runs, 2);

    call();
    assert.strictEqual(runs, 3, 'a call after a quiet interval is answered at once');
    call();
    call.cancel();
    t.mock.timers.tick(5000);
    assert.strictEqual(runs, 3, 'a cancelled run never happens');
});
