const ChatService = require("../services/chat")
const { userFromToken, sessionUser, tokenVersionOf } = require('../auth/token');
const { postChatMessage } = require('./chatMessage');

let ioInstance = null;

const SESSION_CHECK_FAILED = 'session check failed';

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

const onUserConnected = (socket, usersConnected) => async () => {
    try {
        socket.emit('user-on', Array.from(usersConnected.keys()));
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

    const usersConnected = new Map();

    io.on('connection', (socket) => {
        const { id } = socket.client;

        socket.on('user connected', onUserConnected(socket, usersConnected));

        socket.on('new-user', async () => {
            if (!socket.userInfo) {
                return;
            }
            const login = socket.userInfo.login;
            console.log('connection' + login);

            usersConnected.set(login, [socket.client.id, socket.id]);
            io.emit('user-on', Array.from(usersConnected.keys()));
            return;
        });

        socket.on("chat message", async (payload, ack) => {
            const reply = typeof ack === 'function' ? ack : () => {};

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
            for (const key of usersConnected.keys()) {
                if (usersConnected.get(key)[0] === id) {
                    usersConnected.delete(key);
                    break;
                }
            }

            io.emit('user-on', Array.from(usersConnected.keys()));
        })
    })
}

module.exports.getIo = () => ioInstance;
module.exports.onUserConnected = onUserConnected;
module.exports.authenticateHandshake = authenticateHandshake;
module.exports.SESSION_CHECK_FAILED = SESSION_CHECK_FAILED;
