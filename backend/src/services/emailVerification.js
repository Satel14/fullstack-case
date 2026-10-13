const crypto = require('crypto');
const { Op } = require('sequelize');
const sequelize = require('../config/db');
const EmailVerification = require('../models/emailVerification');
const User = require('../models/user');

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const SWEEP_INTERVAL_MS = 60 * 60 * 1000;
const TOKEN_FORMAT = /^[0-9a-f]{64}$/;

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const isUniqueViolation = (e) => Boolean(e && (
    e.name === 'SequelizeUniqueConstraintError' || (e.original && e.original.code === 'ER_DUP_ENTRY')
));

const isDeadlock = (e) => Boolean(e && e.original && e.original.code === 'ER_LOCK_DEADLOCK');

const hasAccount = async (email, t) => Boolean(await User.findOne({
    where: { user_email: email }, attributes: ['user_id'], transaction: t, lock: t.LOCK.SHARE,
}));

const takenBy = async (pending, options = {}) => {
    if (await User.count({ where: { user_login: pending.ev_login }, ...options })) {
        return 'login-taken';
    }
    if (await User.count({ where: { user_email: pending.ev_email }, ...options })) {
        return 'email-taken';
    }
    return null;
};

module.exports.TOKEN_TTL_MS = TOKEN_TTL_MS;

const sweepStale = (now = new Date()) => EmailVerification.destroy({
    where: { ev_expiresAt: { [Op.lte]: now } },
});

module.exports.sweepStale = sweepStale;

module.exports.startSweep = ({ intervalMs = SWEEP_INTERVAL_MS, run = sweepStale } = {}) => {
    let stopped = false;
    let timer = null;
    const tick = async () => {
        try {
            await run();
        } catch (e) {
            console.error('[EmailVerification] sweep failed:', e.message);
        }
        if (!stopped) {
            timer = setTimeout(tick, intervalMs);
            timer.unref();
        }
    };
    tick();
    return {
        stop: () => {
            stopped = true;
            clearTimeout(timer);
        },
    };
};

module.exports.createPending = async ({
    login, email, passwordHash, avatar,
}, now = new Date()) => {
    const token = crypto.randomBytes(32).toString('hex');
    await EmailVerification.create({
        ev_login: login,
        ev_email: email,
        ev_passwordHash: passwordHash,
        ev_avatar: avatar,
        ev_tokenHash: hashToken(token),
        ev_expiresAt: new Date(now.getTime() + TOKEN_TTL_MS),
        created_at: now,
    });
    return token;
};

const CONFIRM_ATTEMPTS = 3;

module.exports.confirm = async (token, now = new Date()) => {
    if (typeof token !== 'string' || !TOKEN_FORMAT.test(token)) {
        return { outcome: 'invalid' };
    }
    const tokenHash = hashToken(token);
    for (let attempt = 1; attempt <= CONFIRM_ATTEMPTS; attempt += 1) {
        let claimed = null;
        try {
            return await sequelize.transaction(async (t) => {
                const found = await EmailVerification.findOne({ where: { ev_tokenHash: tokenHash }, transaction: t });
                if (!found) {
                    return { outcome: 'invalid' };
                }
                const addressRows = await EmailVerification.findAll({
                    where: { ev_email: found.ev_email },
                    order: [['ev_id', 'ASC']],
                    lock: t.LOCK.UPDATE,
                    transaction: t,
                });
                const pending = addressRows.find((row) => row.ev_tokenHash === tokenHash);
                if (!pending) {
                    return { outcome: 'invalid' };
                }
                if (pending.ev_usedAt !== null) {
                    return { outcome: (await hasAccount(pending.ev_email, t)) ? 'email-taken' : 'invalid' };
                }
                if (pending.ev_expiresAt <= now) {
                    return { outcome: 'invalid' };
                }
                claimed = pending;
                const taken = await takenBy(pending, { transaction: t });
                if (taken) {
                    return { outcome: taken };
                }
                const user = await User.create({
                    user_login: pending.ev_login,
                    user_password: pending.ev_passwordHash,
                    user_email: pending.ev_email,
                    user_avatar: pending.ev_avatar,
                    user_balance: 0,
                    user_rank: 0,
                    created_at: now,
                    updated_at: now,
                }, { transaction: t });
                await EmailVerification.update(
                    { ev_usedAt: now },
                    { where: { ev_email: pending.ev_email, ev_usedAt: null }, transaction: t },
                );
                return { outcome: 'created', userId: user.user_id };
            });
        } catch (e) {
            if (isDeadlock(e)) {
                if (attempt === CONFIRM_ATTEMPTS) {
                    throw e;
                }
            } else if (isUniqueViolation(e) && claimed) {
                const taken = await takenBy(claimed);
                if (!taken) {
                    throw e;
                }
                return { outcome: taken };
            } else {
                throw e;
            }
        }
    }
    throw new Error('confirm: exhausted retries without resolving');
};
