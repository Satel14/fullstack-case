const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { resetTestDatabase } = require('./helpers/db');
const { createMigrator } = require('../src/db/migrator');

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

const INDEX_MIGRATION = '20260930000000-storage-status-updated-index.js';

const storageIndexes = async (sequelize) => (await sequelize.getQueryInterface().showIndex('storage'))
    .map((i) => i.name);

test('the migrations index storage by status and update time, and the revert drops only that index', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;

    assert.ok((await storageIndexes(sequelize)).includes('storage_status_updated_at'));

    await createMigrator(sequelize, { quiet: true }).down({ to: INDEX_MIGRATION });
    const after = await storageIndexes(sequelize);
    assert.ok(!after.includes('storage_status_updated_at'));
    assert.ok(after.includes('storage_user_id_status'));

    const cli = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'migrate.js'), 'utf8');
    assert.ok(cli.includes(`'${INDEX_MIGRATION}':`), 'the revert must name what it costs in DOWN_EFFECTS');
});

const Storage = require('../src/models/storage');

const seedRows = async (sequelize, rows) => {
    await sequelize.query(
        "INSERT INTO users (login, password, email, balance, `rank`, role) VALUES "
        + "('one', 'x', 'one@e.ua', 0, 0, 1), ('two', 'x', 'two@e.ua', 0, 0, 1)",
    );
    for (const row of rows) {
        // eslint-disable-next-line no-await-in-loop
        await Storage.create({
            storage_userId: row.userId,
            storage_itemId: 707,
            storage_color: 'default',
            storage_caseId: 'dust2',
            storage_status: row.status,
            storage_extraData: row.status === 'waitingtrade' ? 'steam:abc' : null,
            created_at: row.updatedAt || new Date(),
            updated_at: row.updatedAt,
        });
    }
};

const statuses = async () => (await Storage.findAll({ order: [['storage_id', 'ASC']] }))
    .map((r) => r.storage_status);

test('the sweep completes requests older than the delay and leaves everything else alone', async () => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    const WithdrawalService = require('../src/services/withdrawal');
    const now = new Date('2026-10-12T12:00:00Z');
    const ago = (ms) => new Date(now.getTime() - ms);

    await seedRows(sequelize, [
        { userId: 1, status: 'waitingtrade', updatedAt: ago(WithdrawalService.WITHDRAW_DELAY_MS + 1000) },
        { userId: 2, status: 'waitingtrade', updatedAt: ago(WithdrawalService.WITHDRAW_DELAY_MS) },
        { userId: 1, status: 'waitingtrade', updatedAt: ago(30 * 1000) },
        { userId: 1, status: 'waitingtrade', updatedAt: null },
        { userId: 1, status: 'inventory', updatedAt: ago(10 * 60 * 1000) },
        { userId: 2, status: 'money', updatedAt: ago(10 * 60 * 1000) },
    ]);

    assert.strictEqual(await WithdrawalService.completeDue(now), 3);
    assert.deepStrictEqual(await statuses(), ['received', 'received', 'waitingtrade', 'received', 'inventory', 'money']);
    assert.strictEqual(await WithdrawalService.completeDue(now), 0, 'a second sweep changes nothing');
});

test('completesAt is the latest moment a sweep has completed the request: delay plus one sweep interval', () => {
    const WithdrawalService = require('../src/services/withdrawal');
    assert.strictEqual(WithdrawalService.WITHDRAW_DELAY_MS, 60000);
    assert.strictEqual(WithdrawalService.SWEEP_INTERVAL_MS, 10000);
    assert.strictEqual(
        WithdrawalService.completesAt('2026-10-12T12:00:00.000Z').toISOString(),
        '2026-10-12T12:01:10.000Z',
    );
});

test('the server starts the sweep only once migrations are verified and it is listening', () => {
    const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
    const gateOpens = server.indexOf('assertMigrationsApplied(sequelize).then(');
    const gateCloses = server.indexOf('}).catch(', gateOpens);
    const listenAt = server.indexOf('app.listen(', gateOpens);
    const sweepAt = server.indexOf("require('./src/services/withdrawal').startSweep()");
    assert.ok(gateOpens !== -1 && gateCloses > gateOpens, 'server.js no longer gates the listen on migrations');
    assert.ok(sweepAt > listenAt && listenAt > gateOpens && sweepAt < gateCloses, 'the sweep must start inside the gate, after listen');
    assert.strictEqual(server.split('startSweep(').length - 1, 1, 'the sweep must be started exactly once');
});

test('importing the withdrawal service neither schedules nor runs a sweep', async () => {
    const servicePath = require.resolve('../src/services/withdrawal');
    delete require.cache[servicePath];
    const db = require('../src/config/db');
    const realTransaction = db.transaction;
    const realTimeout = global.setTimeout;
    const realInterval = global.setInterval;
    const calls = [];
    const fromService = () => /services[\\/]withdrawal\.js/.test(new Error().stack);
    const record = (name) => { if (fromService()) calls.push(name); };
    db.transaction = (...args) => { record('transaction'); return realTransaction.apply(db, args); };
    global.setTimeout = (...args) => { record('setTimeout'); return realTimeout(...args); };
    global.setInterval = (...args) => { record('setInterval'); return realInterval(...args); };
    try {
        require('../src/services/withdrawal');
        await new Promise((resolve) => { setImmediate(resolve); });
    } finally {
        db.transaction = realTransaction;
        global.setTimeout = realTimeout;
        global.setInterval = realInterval;
    }
    assert.deepStrictEqual(calls, []);
});

test('sweeps never overlap: the next one starts only after the previous one finished', async () => {
    const WithdrawalService = require('../src/services/withdrawal');
    let running = 0;
    let mostAtOnce = 0;
    let runs = 0;
    const slowSweep = async () => {
        running += 1;
        runs += 1;
        mostAtOnce = Math.max(mostAtOnce, running);
        await new Promise((resolve) => { setTimeout(resolve, 60); });
        running -= 1;
        return 0;
    };

    const sweep = WithdrawalService.startSweep({ intervalMs: 5, run: slowSweep });
    await new Promise((resolve) => { setTimeout(resolve, 400); });
    sweep.stop();

    assert.ok(runs >= 3, `only ${runs} sweeps ran`);
    assert.strictEqual(mostAtOnce, 1);
});

test('a failed sweep is logged and the next one still runs', async () => {
    const WithdrawalService = require('../src/services/withdrawal');
    let runs = 0;
    const errors = [];
    const originalError = console.error;
    console.error = (...args) => { errors.push(args.join(' ')); };
    try {
        const sweep = WithdrawalService.startSweep({
            intervalMs: 5,
            run: async () => { runs += 1; throw new Error('database gone'); },
        });
        await new Promise((resolve) => { setTimeout(resolve, 100); });
        sweep.stop();
    } finally {
        console.error = originalError;
    }

    assert.ok(runs >= 2, `only ${runs} sweeps ran`);
    assert.ok(errors.some((line) => line.includes('database gone')));
});
