const test = require('node:test');
const assert = require('node:assert');
const { assertSafeTestDatabase } = require('./helpers/db');

const managerPath = require.resolve('../src/redis/manager');
require.cache[managerPath] = {
    id: managerPath, filename: managerPath, loaded: true, exports: { getAllDataHashWithKey: async () => ({}) },
};

const sequelize = require('../src/config/db');
const Storage = require('../src/models/storage');
const CaseOpenRecord = require('../src/models/caseOpenRecord');
const AdminAction = require('../src/models/adminAction');
const User = require('../src/models/user');
const StorageService = require('../src/services/storage');
const PFService = require('../src/services/provablyFair');
const AdminActionService = require('../src/services/adminAction');
const UserService = require('../src/services/user');
const { MAX_OFFSET, pageOffset } = require('../src/helpers/paging');

test.before(() => {
    assertSafeTestDatabase();
});

test.after(async () => {
    await sequelize.close();
});

const HUGE = '100000000000000000000';

test('an offset is a whole number from 0 up to the largest one MySQL takes', () => {
    assert.strictEqual(MAX_OFFSET, 2147483647);
    assert.deepStrictEqual(
        [HUGE, '9'.repeat(400), '-5', 'abc', '', undefined, '12', 7, ['3', '4']].map(pageOffset),
        [MAX_OFFSET, MAX_OFFSET, 0, 0, 0, 0, 12, 7, 3],
    );
});

test('every paged list hands the database an offset it accepts, however large the one asked for', async () => {
    const asked = [];
    const record = (answer) => async (options) => { asked.push(options.offset); return answer; };
    const stubs = [
        [Storage, 'findAll', record([])],
        [CaseOpenRecord, 'findAll', record([])],
        [AdminAction, 'findAll', record([])],
        [User, 'findAndCountAll', record({ rows: [], count: 0 })],
    ];
    const originals = stubs.map(([model, method]) => [model, method, model[method]]);
    stubs.forEach(([model, method, impl]) => { model[method] = impl; });
    try {
        await StorageService.getStorageById(1, 'inventory', { limit: 50, offset: HUGE });
        await PFService.getHistory(1, 50, HUGE);
        await AdminActionService.list({ limit: 50, offset: HUGE });
        await UserService.getUsersPaged({ limit: 50, offset: HUGE });
    } finally {
        originals.forEach(([model, method, original]) => { model[method] = original; });
    }

    assert.deepStrictEqual(asked, [MAX_OFFSET, MAX_OFFSET, MAX_OFFSET, MAX_OFFSET]);
});
