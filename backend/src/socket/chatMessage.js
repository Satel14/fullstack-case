const ROLES = require('../constant/enums/roles');

const CHAT_MUTED_ROLES = [ROLES.BANNED, ROLES.BANNED_CHAT];
const MAX_MESSAGE_LENGTH = 500;

const canPostInChat = (role) => !CHAT_MUTED_ROLES.includes(Number(role));

async function postChatMessage(userInfo, msg, { findUser, saveMessage, now = Date.now }) {
    if (!userInfo) {
        return { ok: false, reason: 'unauthorized' };
    }
    if (typeof msg !== 'string' || !msg.trim()) {
        return { ok: false, reason: 'empty' };
    }
    if (msg.length > MAX_MESSAGE_LENGTH) {
        return { ok: false, reason: 'tooLong' };
    }

    const user = await findUser(userInfo.id);
    if (!user) {
        return { ok: false, reason: 'unauthorized' };
    }
    if (!canPostInChat(user.user_role)) {
        return { ok: false, reason: 'banned' };
    }

    const message = {
        login: user.user_login,
        msg,
        id: user.user_id,
        avatar: user.user_avatar,
        time: Math.round(now() / 1000),
    };
    await saveMessage(message);

    return { ok: true, message };
}

module.exports = { MAX_MESSAGE_LENGTH, canPostInChat, postChatMessage };
