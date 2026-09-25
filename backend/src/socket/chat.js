const ChatService = require("../services/chat")
const { userFromToken, sessionUser, tokenVersionOf } = require('../auth/token');
const { postChatMessage } = require('./chatMessage');
const { createRateLimiter, createTrailingThrottle } = require('./throttle');
const { createPresence } = require('./presence');

let ioInstance = null;
let presenceInstance = null;

const SESSION_CHECK_FAILED = 'session check failed';
const CHAT_MESSAGE_BURST = 5;
const CHAT_MESSAGE_REFILL_MS = 1000;
const CHAT_STATE_INTERVAL_MS = 1000;
const ROSTER_BROADCAST_INTERVAL_MS = 1000;

const chatSenderKey = (socket) => (socket.userInfo ? `user:${socket.userInfo.id}` : `socket:${socket.id}`);

const authenticateHandshake = async (socket, next) => {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    socket.userInfo = null;

    if (!token) {
        return next();
    }

    let user;
    try {
        user = await userFromToken(token);
    } catch (e) {
        console.error('[chat] handshake session check failed:', e.message);
        return next(new Error(SESSION_CHECK_FAILED));
    }
    socket.userInfo = user ? {
        id: user.user_id,
        login: user.user_login,
        avatar: user.user_avatar,
        role: user.user_role,
        ver: tokenVersionOf(token),
    } : null;
    return next();
};

const onUserConnected = (socket, presence) => async () => {
    try {
        socket.emit('user-on', presence.chatLogins());
        const lastMessages = await ChatService.get();
        socket.emit('chat messages', lastMessages);
    } catch (e) {
        console.error('[chat] user connected error:', e.message);
    }
};

module.exports = function (server) {
    const io = require('socket.io')(server, {
        cors: {
            origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
            methods: ['GET', 'POST'],
            credentials: true,
        },
    });

    ioInstance = io;

    io.use(authenticateHandshake);

    const presence = createPresence();
    presenceInstance = presence;
    const chatLimiter = createRateLimiter({ burst: CHAT_MESSAGE_BURST, refillMs: CHAT_MESSAGE_REFILL_MS });
    const broadcastRoster = createTrailingThrottle(
        () => io.emit('user-on', presence.chatLogins()),
        ROSTER_BROADCAST_INTERVAL_MS
    );

    io.on('connection', (socket) => {
        presence.connect(socket.id, socket.userInfo);

        const sendChatState = createTrailingThrottle(onUserConnected(socket, presence), CHAT_STATE_INTERVAL_MS);
        socket.on('user connected', () => sendChatState());

        socket.on('new-user', () => {
            if (presence.joinChat(socket.id)) {
                console.log('connection' + socket.userInfo.login);
                broadcastRoster();
            }
        });

        socket.on("chat message", async (payload, ack) => {
            const reply = typeof ack === 'function' ? ack : () => {};

            if (!chatLimiter.take(chatSenderKey(socket))) {
                reply({ ok: false, reason: 'tooFast' });
                return;
            }

            try {
                const result = await postChatMessage(socket.userInfo, payload && payload.msg, {
                    findUser: (id) => sessionUser(id, socket.userInfo.ver),
                    saveMessage: ChatService.add,
                });

                if (result.ok) {
                    socket.broadcast.emit("chat message", result.message);
                }
                reply({ ok: result.ok, reason: result.reason });
            } catch (e) {
                console.error('[chat] chat message error:', e.message);
                reply({ ok: false, reason: 'error' });
            }
        })

        socket.on('disconnect', () => {
            sendChatState.cancel();
            if (presence.disconnect(socket.id)) {
                broadcastRoster();
            }
        })
    })
}

module.exports.getIo = () => ioInstance;
module.exports.onlinePresence = () => (presenceInstance ? presenceInstance.online() : { count: 0, userIds: [] });
module.exports.onUserConnected = onUserConnected;
module.exports.authenticateHandshake = authenticateHandshake;
module.exports.SESSION_CHECK_FAILED = SESSION_CHECK_FAILED;
