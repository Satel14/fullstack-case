const ChatService = require("../services/chat")

module.exports = function(server) {
    const io = require('socket.io')(server, {
        cors: {
            // origin: 'https://127.0.0.1:3003',
            methods: ['GET', 'POST'],
            credentials: true,
        },
    });

    const usersConnected = new Map();

    io.on('connection', (socket) => {
        const { id } = socket.client;

        socket.on('user connected', async () => {
            console.log('анонім підключився +++');

            io.emit('users-on', Array.from(usersConnected.keys()));
            const lastMessages = await ChatService.get();
            io.emit('chat messages', lastMessages);
            return;
        });

        socket.on('new-user', async (login) => {
            console.log('connection' + login);

            usersConnected.set(login, [socket.client.id, socket.id]);
            io.emit('users-on', Array.from(usersConnected.keys()));
            return;
        });

        socket.on("chat message", async ({ login, msg, avatar, id }) => {
            const messageObj = {
                login,
                msg,
                id,
                avatar,
                time: Math.round(Date.now() / 1000),
            }

            if (!login) {
                return;
            }

            await ChatService.add(messageObj);
            socket.broadcast.emit("chat message", messageObj);
        })

        socket.on('disconnect', () => {
            for (const key of usersConnected.keys()) {
                if (usersConnected.get(key)[0] === id) {
                    usersConnected.delete(key);
                    break;
                }
            }

            io.emit('users-on', Array.from(usersConnected.keys()));
        })
    })
}
