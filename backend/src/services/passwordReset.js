const crypto = require('crypto');
const sequelize = require('../config/db');
const PasswordReset = require('../models/passwordReset');
const User = require('../models/user');

const TOKEN_TTL_MS = 30 * 60 * 1000;
const TOKEN_FORMAT = /^[0-9a-f]{64}$/;

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

module.exports.TOKEN_TTL_MS = TOKEN_TTL_MS;

module.exports.issueToken = async (userId) => {
    const token = crypto.randomBytes(32).toString('hex');
    const now = new Date();
    await PasswordReset.create({
        reset_userId: userId,
        reset_tokenHash: hashToken(token),
        reset_expiresAt: new Date(now.getTime() + TOKEN_TTL_MS),
        created_at: now,
    });
    return token;
};

module.exports.resetPassword = async (token, passwordHash) => {
    if (typeof token !== 'string' || !TOKEN_FORMAT.test(token)) {
        return false;
    }

    return sequelize.transaction(async (t) => {
        const now = new Date();
        const reset = await PasswordReset.findOne({
            where: { reset_tokenHash: hashToken(token) },
            transaction: t,
            lock: t.LOCK.UPDATE,
        });
        if (!reset || reset.reset_usedAt !== null || reset.reset_expiresAt <= now) {
            return false;
        }

        await User.update(
            { user_password: passwordHash, user_tokenVersion: sequelize.literal('tokenVersion + 1') },
            { where: { user_id: reset.reset_userId }, transaction: t },
        );
        await PasswordReset.update(
            { reset_usedAt: now },
            { where: { reset_userId: reset.reset_userId, reset_usedAt: null }, transaction: t },
        );
        return true;
    });
};
