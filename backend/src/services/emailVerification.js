const crypto = require('crypto');
const { Op } = require('sequelize');
const sequelize = require('../config/db');
const EmailVerification = require('../models/emailVerification');
const User = require('../models/user');

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const TOKEN_FORMAT = /^[0-9a-f]{64}$/;

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const isUniqueViolation = (e) => Boolean(e && (
    e.name === 'SequelizeUniqueConstraintError' || (e.original && e.original.code === 'ER_DUP_ENTRY')
));

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

module.exports.createPending = async ({
    login, email, passwordHash, avatar,
}, now = new Date()) => {
    await EmailVerification.destroy({
        where: { [Op.or]: [{ ev_expiresAt: { [Op.lte]: now } }, { ev_usedAt: { [Op.ne]: null } }] },
    });
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

module.exports.confirm = async (token, now = new Date()) => {
    if (typeof token !== 'string' || !TOKEN_FORMAT.test(token)) {
        return { outcome: 'invalid' };
    }
    let claimed = null;
    try {
        return await sequelize.transaction(async (t) => {
            const pending = await EmailVerification.findOne({
                where: { ev_tokenHash: hashToken(token) },
                transaction: t,
                lock: t.LOCK.UPDATE,
            });
            if (!pending || pending.ev_usedAt !== null || pending.ev_expiresAt <= now) {
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
        if (isUniqueViolation(e) && claimed) {
            return { outcome: (await takenBy(claimed)) || 'email-taken' };
        }
        throw e;
    }
};
