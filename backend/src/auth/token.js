const jwt = require('jsonwebtoken');
const jwtOptions = require('./jwtConfig');
const User = require('../models/user');

const SESSION_FIELDS = [
    'user_id',
    'user_login',
    'user_balance',
    'user_avatar',
    'user_email',
    'user_receiveInfo',
    'user_role',
    'user_tokenVersion',
];

const versionOf = (ver) => Number(ver) || 0;

const withoutVersion = ({ user_tokenVersion, ...rest }) => rest;

module.exports.signToken = (user) => jwt.sign(
    { id: user.user_id, ver: versionOf(user.user_tokenVersion) },
    jwtOptions.secretOrKey,
    jwtOptions.signOptions,
);

module.exports.tokenVersionOf = (token) => {
    const payload = jwt.decode(token);
    return versionOf(payload && payload.ver);
};

module.exports.sessionUser = async (id, ver) => {
    const user = await User.findByPk(id, { attributes: SESSION_FIELDS });
    if (!user || user.user_tokenVersion !== versionOf(ver)) {
        return null;
    }
    return withoutVersion(user.dataValues);
};

module.exports.userFromToken = async (token) => {
    let payload;
    try {
        payload = jwt.verify(token, jwtOptions.secretOrKey);
    } catch (e) {
        return null;
    }
    return module.exports.sessionUser(payload.id, payload.ver);
};

module.exports.withoutVersion = withoutVersion;
