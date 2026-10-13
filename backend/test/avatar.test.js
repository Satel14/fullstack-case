const test = require('node:test');
const assert = require('node:assert');
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

let mailOn = false;
const mailLog = [];
const mailPath = require.resolve('../src/modules/mailSender');
require.cache[mailPath] = {
    id: mailPath,
    filename: mailPath,
    loaded: true,
    exports: {
        isEnabled: () => mailOn,
        userRegistered: (mailTo) => { mailLog.push({ kind: 'welcome', mailTo }); },
        emailConfirmationLink: (mailTo) => { mailLog.push({ kind: 'confirm', mailTo }); },
        registrationAttemptNotice: (mailTo) => { mailLog.push({ kind: 'attempt', mailTo }); },
        passwordResetLink: () => {},
    },
};

const MESSAGE = require('../src/constant/responseMessages');

const BAD_AVATARS = [-5, 0, 7, 1.5, 1e20, 'abc', '3', null, {}, [2], true];

const handlers = {};
require('../src/auth/register')({ post: (route, ...chain) => { handlers[route] = chain[chain.length - 1]; } });

const answer = (handler, req) => new Promise((resolve) => {
    const res = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(payload) { resolve({ code: this.statusCode, payload }); return this; },
    };
    handler(req, res);
});

const register = (fields) => answer(handlers['/api/profile/register'], {
    body: {
        login: 'newbie', password: 'secret123', email: 'newbie@e.ua', ...fields,
    },
});

const editProfile = (body) => answer(require('../src/controllers/user').editUser, { body, user: { profile: { user_id: 1 } } });

const fresh = async ({ mail }) => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    mailOn = mail;
    mailLog.length = 0;
    return sequelize;
};

const rows = async (sequelize, table) => {
    const [found] = await sequelize.query(`SELECT login, avatar FROM ${table} ORDER BY login`);
    return found.map((r) => [r.login, r.avatar]);
};

const settle = () => new Promise((resolve) => { setTimeout(resolve, 300); });

const rowsOnceStored = async (sequelize, table, count) => {
    for (let attempt = 0; attempt < 50; attempt += 1) {
        const found = await rows(sequelize, table);
        if (found.length >= count) {
            return found;
        }
        await settle();
    }
    return rows(sequelize, table);
};

[false, true].forEach((mail) => {
    const path = mail ? 'with mail' : 'without mail';

    test(`registration ${path} refuses an avatar outside the list and stores nothing`, async () => {
        const sequelize = await fresh({ mail });

        for (const avatar of BAD_AVATARS) {
            const result = await register({ avatar });
            assert.deepStrictEqual(
                { code: result.code, message: result.payload.message },
                { code: 422, message: MESSAGE.USER.AVATAR_INVALID },
                JSON.stringify(avatar),
            );
        }

        await settle();
        assert.deepStrictEqual(await rows(sequelize, 'users'), []);
        assert.deepStrictEqual(await rows(sequelize, 'email_verifications'), []);
        assert.deepStrictEqual(mailLog, []);
    });

    test(`registration ${path} keeps an avatar from the list and gives the default one when none is sent`, async () => {
        const sequelize = await fresh({ mail });
        const table = mail ? 'email_verifications' : 'users';

        const chosen = await register({ avatar: 6 });
        const unset = await register({ login: 'second', email: 'second@e.ua' });

        assert.deepStrictEqual([chosen.code, unset.code], mail ? [202, 202] : [200, 200]);
        assert.deepStrictEqual(await rowsOnceStored(sequelize, table, 2), [['newbie', 6], ['second', 1]]);
    });
});

const withPlayer = async (sequelize) => {
    await sequelize.query(
        "INSERT INTO users (login, password, email, avatar, balance, `rank`, role) VALUES ('player', 'x', 'p@e.ua', 2, 0, 0, 1)",
    );
};

test('a profile edit refuses an avatar outside the list and keeps the stored one', async () => {
    const sequelize = await fresh({ mail: false });
    await withPlayer(sequelize);

    for (const avatar of BAD_AVATARS) {
        const result = await editProfile({ user_avatar: avatar });
        assert.deepStrictEqual(
            { code: result.code, message: result.payload.message },
            { code: 422, message: MESSAGE.USER.AVATAR_INVALID },
            JSON.stringify(avatar),
        );
    }

    assert.deepStrictEqual(await rows(sequelize, 'users'), [['player', 2]]);
});

test('a profile edit stores an avatar from the list and still edits receive info without one', async () => {
    const sequelize = await fresh({ mail: false });
    await withPlayer(sequelize);

    const avatar = await editProfile({ user_avatar: 5 });
    const receiveInfo = await editProfile({ user_receiveInfo: 'steam: player' });

    assert.deepStrictEqual([avatar.code, receiveInfo.code], [200, 200]);
    const [[user]] = await sequelize.query('SELECT avatar, receiveInfo FROM users WHERE id = 1');
    assert.deepStrictEqual([user.avatar, user.receiveInfo], [5, 'steam: player']);
});
