const { rateLimit } = require('express-rate-limit');
const MESSAGE = require('../constant/responseMessages');

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 429, message: MESSAGE.LIMIT.AUTH },
});

const caseOpenLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 429, message: MESSAGE.LIMIT.CASE_OPEN },
});

const onlineLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 429, message: MESSAGE.LIMIT.REQUESTS },
});

const depositLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 429, message: MESSAGE.LIMIT.DEPOSIT },
});

const resetLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 429, message: MESSAGE.LIMIT.PROFILE_RESET },
});

const bonusLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 429, message: MESSAGE.LIMIT.BONUS },
});

const seedRotateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 429, message: MESSAGE.LIMIT.SEED_ROTATE },
});

const verifyLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 429, message: MESSAGE.LIMIT.VERIFY },
});

const adminLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 429, message: MESSAGE.LIMIT.REQUESTS },
});

const byPlayer = (req) => String(req.user.profile.user_id);

const promocodeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    keyGenerator: byPlayer,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 429, message: MESSAGE.LIMIT.PROMOCODE },
});

const transferLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    keyGenerator: byPlayer,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 429, message: MESSAGE.LIMIT.TRANSFER },
});

const sellLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 400,
    keyGenerator: byPlayer,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 429, message: MESSAGE.LIMIT.SELL },
});

const receiveLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    keyGenerator: byPlayer,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 429, message: MESSAGE.LIMIT.WITHDRAW },
});

const withdrawCancelLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    keyGenerator: byPlayer,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 429, message: MESSAGE.LIMIT.WITHDRAW_CANCEL },
});

module.exports = {
    authLimiter, caseOpenLimiter, onlineLimiter, depositLimiter, resetLimiter, bonusLimiter, adminLimiter,
    seedRotateLimiter, verifyLimiter, promocodeLimiter, transferLimiter, sellLimiter, receiveLimiter, withdrawCancelLimiter,
};
