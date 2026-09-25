const PASSWORD_MIN = 6;
const PASSWORD_MAX_BYTES = 72;
const LOGIN_PATTERN = /^[A-Za-z0-9_.-]{3,32}$/;

const isAcceptablePassword = (password) => typeof password === 'string'
    && password.length >= PASSWORD_MIN
    && Buffer.byteLength(password, 'utf8') <= PASSWORD_MAX_BYTES;

const isAcceptableLogin = (login) => typeof login === 'string' && LOGIN_PATTERN.test(login);

module.exports = {
    isAcceptablePassword,
    isAcceptableLogin,
};
