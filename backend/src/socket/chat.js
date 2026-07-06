const jwt = require('jsonwebtoken');
const ChatService = require("../services/chat")
const jwtOptions = require('../auth/jwtConfig');
const UserService = require('../services/user');

let ioInstance = null;

module.exports = function (server) {
    const io = require('socket.io')(server, {
        cors: {
            origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
            methods: ['GET', 'POST'],
            credentials: true,
        },
    });

    ioInstance = io;

    io.use(async (socket, next) => {
        const token = socket.handshake.auth && socket.handshake.auth.token;
        socket.userInfo = null;

        if (!token) {
            return next();
        }

        try {
            const payload = jwt.verify(token, jwtOptions.secretOrKey);
            const user = await UserService.getUserById(payload.id);
            socket.userInfo = {
                id: user.user_id,
                login: user.user_login,
                avatar: user.user_avatar,
                role: user.user_role,
            };
        } catch (e) {
            socket.userInfo = null;
        }

        return next();
    });

    const usersConnected = new Map();

    io.on('connection', (socket) => {
        const { id } = socket.client;

        socket.on('user connected', async () => {
            try {
                io.emit('user-on', Array.from(usersConnected.keys()));
                const lastMessages = await ChatService.get();
                io.emit('chat messages', lastMessages);
            } catch (e) {
                console.error('[chat] user connected error:', e.message);
            }
        });

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

        socket.on("chat message", async ({ msg }) => {
            if (!socket.userInfo) {
                return;
            }
            if (!msg || !String(msg).trim()) {
                return;
            }

            try {
                const messageObj = {
                    login: socket.userInfo.login,
                    msg,
                    id: socket.userInfo.id,
                    avatar: socket.userInfo.avatar,
                    time: Math.round(Date.now() / 1000),
                }

                await ChatService.add(messageObj);
                socket.broadcast.emit("chat message", messageObj);
            } catch (e) {
                console.error('[chat] chat message error:', e.message);
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
