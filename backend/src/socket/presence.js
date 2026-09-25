function createPresence() {
    const sockets = new Map();
    const users = new Map();
    let anonymous = 0;

    const connect = (socketId, user) => {
        sockets.set(socketId, { userId: user ? user.id : null, inChat: false });
        if (!user) {
            anonymous += 1;
            return;
        }
        const entry = users.get(user.id) || { login: user.login, sockets: new Set(), chatSockets: new Set() };
        entry.login = user.login;
        entry.sockets.add(socketId);
        users.set(user.id, entry);
    };

    const joinChat = (socketId) => {
        const socket = sockets.get(socketId);
        if (!socket || socket.userId === null || socket.inChat) {
            return false;
        }
        socket.inChat = true;
        const entry = users.get(socket.userId);
        entry.chatSockets.add(socketId);
        return entry.chatSockets.size === 1;
    };

    const disconnect = (socketId) => {
        const socket = sockets.get(socketId);
        if (!socket) {
            return false;
        }
        sockets.delete(socketId);
        if (socket.userId === null) {
            anonymous -= 1;
            return false;
        }
        const entry = users.get(socket.userId);
        entry.sockets.delete(socketId);
        const leftChat = entry.chatSockets.delete(socketId) && entry.chatSockets.size === 0;
        if (entry.sockets.size === 0) {
            users.delete(socket.userId);
        }
        return leftChat;
    };

    const chatLogins = () => [...users.values()]
        .filter((entry) => entry.chatSockets.size > 0)
        .map((entry) => entry.login);

    const online = () => ({ count: users.size + anonymous, userIds: [...users.keys()] });

    return {
        connect, joinChat, disconnect, chatLogins, online,
    };
}

module.exports = { createPresence };
