const PASSWORD_MIN = 6;
const PASSWORD_MAX_BYTES = 72;

const isAcceptablePassword = (password) => typeof password === 'string'
    && password.length >= PASSWORD_MIN
    && Buffer.byteLength(password, 'utf8') <= PASSWORD_MAX_BYTES;

module.exports = {
    isAcceptablePassword,
};
