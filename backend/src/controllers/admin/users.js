const { body, param, validationResult } = require('express-validator');
const UserService = require('../../services/user');
const AdminActionService = require('../../services/adminAction');
const ROLES = require('../../constant/enums/roles');
const MESSAGE = require('../../constant/responseMessages');
const sequelize = require('../../config/db');
const BalanceHistoryService = require('../../services/balanceHistory');
const BalanceHistoryEnum = require('../../constant/enums/balance').BalanceHistory;

const ASSIGNABLE_ROLES = [ROLES.BANNED, ROLES.BANNED_CHAT, ROLES.NORMAL, ROLES.YOUTUBER, ROLES.STREAMER, ROLES.FAMOUS];
const BALANCE_DELTA_LIMIT = 1000000;

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

module.exports.adjustBalance = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422).json({ status: 422, message: MESSAGE.VALIDATOR.ERROR });
        }

        const targetId = parseInt(req.params.id, 10);
        const adminId = req.user.profile.user_id;
        const rawDelta = Number(req.body.delta);
        const delta = Math.round(rawDelta * 100) / 100;
        const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';

        if (!Number.isFinite(delta) || delta === 0 || delta !== rawDelta) {
            return res.status(422).json({ status: 422, message: MESSAGE.VALIDATOR.ERROR });
        }
        if (delta > BALANCE_DELTA_LIMIT || delta < -BALANCE_DELTA_LIMIT) {
            return res.status(422).json({ status: 422, message: MESSAGE.VALIDATOR.ERROR });
        }
        if (!reason) {
            return res.status(422).json({ status: 422, message: MESSAGE.ADMIN.REASON_REQUIRED });
        }
        if (targetId === adminId) {
            return res.status(422).json({ status: 422, message: MESSAGE.ADMIN.SELF_FORBIDDEN });
        }

        const target = await UserService.getUserById(targetId).catch(() => null);
        if (!target) {
            return res.status(422).json({ status: 422, message: MESSAGE.ADMIN.USER_NOT_EXIST });
        }

        await sequelize.transaction(async (t) => {
            const current = await UserService.getBalanceByUserId(targetId, {
                transaction: t,
                lock: t.LOCK.UPDATE,
            });
            const next = Number(current) + delta;
            if (next < 0) {
                const err = new Error(MESSAGE.ADMIN.NEGATIVE_BALANCE);
                err.code = 'NEGATIVE_BALANCE';
                throw err;
            }

            await UserService.incrementBalance(delta, targetId, { transaction: t });
            await BalanceHistoryService.addBalanceChange(
                targetId, BalanceHistoryEnum.ADMIN_ADJUST, delta, reason, { transaction: t },
            );
            await AdminActionService.record(
                {
                    adminId,
                    action: 'user.balance',
                    targetType: 'user',
                    targetId,
                    payload: { before: Number(current), delta, after: next },
                    reason,
                },
                { transaction: t },
            );
        });

        const resulting = await UserService.getBalanceByUserId(targetId);
        return res.status(200).json({ status: 200, balance: Number(resulting) });
    } catch (e) {
        if (e && e.code === 'NEGATIVE_BALANCE') {
            return res.status(422).json({ status: 422, message: e.message });
        }
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
        case 'adjustBalance': {
            return [
                param('id').exists().isInt(),
                body('delta').exists().isFloat({ min: -BALANCE_DELTA_LIMIT, max: BALANCE_DELTA_LIMIT }),
                body('reason').exists().isString().isLength({ min: 1, max: 255 }),
            ];
        }
        default:
            return [];
    }
};
