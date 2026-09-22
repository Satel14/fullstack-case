const ROLES = require('../constant/enums/roles');
const MESSAGE = require('../constant/responseMessages');

function adminOnly(req, res, next) {
    const role = req.user && req.user.profile && req.user.profile.user_role;
    if (Number(role) !== ROLES.ADMINISTRATOR) {
        return res.status(403).json({ status: 403, message: MESSAGE.ADMIN.NOT_ADMIN });
    }
    return next();
}

function notBanned(req, res, next) {
    const role = req.user && req.user.profile && req.user.profile.user_role;
    if (Number(role) === ROLES.BANNED) {
        return res.status(403).json({ status: 403, message: MESSAGE.ADMIN.BANNED });
    }
    return next();
}

module.exports = { adminOnly, notBanned };
