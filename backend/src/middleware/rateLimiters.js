const { rateLimit } = require('express-rate-limit');

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 429, message: 'Забагато спроб. Спробуйте пізніше.' },
});

const caseOpenLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 429, message: 'Забагато відкриттів. Зачекайте трохи.' },
});

const onlineLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 429, message: 'Too many requests.' },
});

const depositLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 429, message: 'Забагато спроб поповнення. Зачекайте трохи.' },
});

const resetLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 429, message: 'Забагато скидань профілю. Зачекайте трохи.' },
});

module.exports = {
    authLimiter, caseOpenLimiter, onlineLimiter, depositLimiter, resetLimiter,
};
