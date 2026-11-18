const { body, param, validationResult } = require('express-validator');
const sequelize = require('../../config/db');
const User = require('../../models/user');
const AdminActionService = require('../../services/adminAction');
const ROLES = require('../../constant/enums/roles');
const MESSAGE = require('../../constant/responseMessages');
const { MYSQL_INT_MAX } = require('../../constant/mysql');
const { withinChars } = require('../../helpers/charLength');
const { answerFailure } = require('../../helpers/failure');

const changeMute = async (req, res, lift) => {
    try {
        const targetId = Number(req.params.id);
        const adminId = req.user.profile.user_id;
        if (targetId === Number(adminId)) throw new Error(MESSAGE.ADMIN.SELF_FORBIDDEN);
        const mutedUntil = await sequelize.transaction(async (transaction) => {
            const target = await User.findByPk(targetId, { transaction, lock: transaction.LOCK.UPDATE });
            if (!target) throw new Error(MESSAGE.ADMIN.USER_NOT_EXIST);
            if (!lift && Number(target.user_role) === ROLES.ADMINISTRATOR) throw new Error(MESSAGE.ADMIN.MUTE_ADMIN_FORBIDDEN);
            const before = target.user_mutedUntil ? target.user_mutedUntil.toISOString() : null;
            const after = lift ? null : new Date(Math.floor(Date.now() / 1000) * 1000 + Number(req.body.durationMinutes) * 60000);
            await target.update({ user_mutedUntil: after }, { transaction });
            await AdminActionService.record({
                adminId,
                action: lift ? 'user.unmute' : 'user.mute',
                targetType: 'user',
                targetId,
                payload: { before, after: after ? after.toISOString() : null },
                reason: req.body.reason.trim(),
            }, { transaction });
            return after ? after.toISOString() : null;
        });
        const serverNow = new Date().toISOString();
        const io = require('../../socket/chat').getIo();
        if (io) io.to(`user:${targetId}`).emit('chat mute', { mutedUntil, serverNow });
        return res.status(200).json({ status: 200, mutedUntil, serverNow });
    } catch (e) {
        return answerFailure(res, e, { status: 422, where: lift ? 'admin.chat.unmute' : 'admin.chat.mute' });
    }
};

module.exports.mute = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ status: 422, message: MESSAGE.VALIDATOR.ERROR });
    return changeMute(req, res, false);
};

module.exports.unmute = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ status: 422, message: MESSAGE.VALIDATOR.ERROR });
    return changeMute(req, res, true);
};

module.exports.removeMessage = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(422).json({ status: 422, message: MESSAGE.VALIDATOR.ERROR });
        const messageId = req.params.id;
        const ChatService = require('../../services/chat');
        await sequelize.transaction(async (transaction) => {
            const message = await ChatService.find(messageId);
            if (!message) throw new Error(MESSAGE.ADMIN.CHAT_MESSAGE_NOT_EXIST);
            const text = Array.from(String(message.msg || '').replace(/\s+/g, ' '));
            const excerpt = `${text.slice(0, Math.min(80, Math.max(0, text.length - 1))).join('')}…`;
            await AdminActionService.record({
                adminId: req.user.profile.user_id,
                action: 'chat.remove',
                targetType: 'chat',
                targetId: messageId,
                payload: { authorId: message.id, authorLogin: message.login, excerpt },
            }, { transaction });
            if (!await ChatService.remove(messageId)) throw new Error(MESSAGE.ADMIN.CHAT_MESSAGE_NOT_EXIST);
        });
        const io = require('../../socket/chat').getIo();
        if (io) io.emit('chat message removed', { messageId });
        return res.status(200).json({ status: 200 });
    } catch (e) {
        return answerFailure(res, e, { status: 422, where: 'admin.chat.removeMessage' });
    }
};

module.exports.validate = (method) => {
    switch (method) {
        case 'mute':
        case 'unmute':
            return [
                param('id').exists({ checkNull: true }).not().isArray().isInt({ min: 1, max: MYSQL_INT_MAX, allow_leading_zeroes: false }),
                body('reason').exists({ checkNull: true }).isString().bail().trim().custom(withinChars(1, 255)),
                ...(method === 'mute' ? [body('durationMinutes').exists({ checkNull: true }).not().isArray().isInt({ min: 1, max: 43200 })] : []),
            ];
        case 'removeMessage':
            return [param('id').exists({ checkNull: true }).isString().isUUID(4)];
        default:
            return [];
    }
};
