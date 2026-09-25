const PASSWORD_MIN = 6;
const PASSWORD_MAX_BYTES = 72;
const LOGIN_PATTERN = /^[A-Za-z0-9_.-]{3,32}$/;
const EMAIL_MAX = 254;
const EMAIL_PATTERN = /^[^\s@\p{C}]+@[^\s@\p{C}]+\.[^\s@\p{C}]+$/u;

const isAcceptablePassword = (password) => typeof password === 'string'
    && password.length >= PASSWORD_MIN
    && Buffer.byteLength(password, 'utf8') <= PASSWORD_MAX_BYTES;

const isAcceptableLogin = (login) => typeof login === 'string' && LOGIN_PATTERN.test(login);

const normalizeEmail = (email) => (typeof email === 'string' ? email.trim() : '');

const isAcceptableEmail = (email) => typeof email === 'string'
    && email.length <= EMAIL_MAX
    && EMAIL_PATTERN.test(email);

module.exports = {
    isAcceptablePassword,
    isAcceptableLogin,
    normalizeEmail,
    isAcceptableEmail,
};
