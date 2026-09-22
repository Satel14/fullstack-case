const { body, param, validationResult } = require('express-validator');
const UserService = require('../../services/user');
const AdminActionService = require('../../services/adminAction');
const ROLES = require('../../constant/enums/roles');
const MESSAGE = require('../../constant/responseMessages');

const ASSIGNABLE_ROLES = [ROLES.BANNED, ROLES.BANNED_CHAT, ROLES.NORMAL, ROLES.YOUTUBER, ROLES.STREAMER, ROLES.FAMOUS];

module.exports.list = async (req, res) => {
    try {
        const data = await UserService.getUsersPaged({
            search: req.query.search,
            limit: req.query.limit,
            offset: req.query.offset,
        });
        return res.status(200).json({ status: 200, data: data.rows, count: data.count });
    } catch (e) {
        return res.status(400).json({ status: 400, message: e.message });
    }
};

module.exports.setRole = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422).json({ status: 422, message: MESSAGE.VALIDATOR.ERROR });
        }

        const targetId = parseInt(req.params.id, 10);
        const role = parseInt(req.body.role, 10);
        const adminId = req.user.profile.user_id;

        if (!ASSIGNABLE_ROLES.includes(role)) {
            const message = role === ROLES.ADMINISTRATOR
                ? MESSAGE.ADMIN.ROLE_ADMIN_FORBIDDEN
                : MESSAGE.ADMIN.ROLE_INVALID;
            return res.status(422).json({ status: 422, message });
        }

        if (targetId === adminId) {
            return res.status(422).json({ status: 422, message: MESSAGE.ADMIN.SELF_FORBIDDEN });
        }

        const target = await UserService.getUserById(targetId).catch(() => null);
        if (!target) {
            return res.status(422).json({ status: 422, message: MESSAGE.ADMIN.USER_NOT_EXIST });
        }

        await UserService.setRole(targetId, role);
        await AdminActionService.record({
            adminId,
            action: 'user.role',
            targetType: 'user',
            targetId,
            payload: { before: target.user_role, after: role },
            reason: req.body.reason,
        });

        return res.status(200).json({ status: 200 });
    } catch (e) {
        return res.status(400).json({ status: 400, message: e.message });
    }
};

module.exports.validate = (method) => {
    switch (method) {
        case 'setRole': {
            return [
                param('id').exists().isInt(),
                body('role').exists().isInt(),
                body('reason').optional().isString().isLength({ max: 255 }),
            ];
        }
        default:
            return [];
    }
};
