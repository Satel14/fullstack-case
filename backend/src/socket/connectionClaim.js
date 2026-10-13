const ALREADY_CONNECTED = 'already connected';

function oncePerConnection(middleware) {
    const owners = new WeakMap();

    const release = (socket) => {
        if (owners.get(socket.conn) === socket.id) {
            owners.delete(socket.conn);
        }
    };

    return (socket, next) => {
        if (owners.has(socket.conn)) {
            return next(new Error(ALREADY_CONNECTED));
        }
        owners.set(socket.conn, socket.id);
        socket.once('disconnect', () => release(socket));
        return middleware(socket, (err) => {
            if (err) {
                release(socket);
            }
            next(err);
        });
    };
}

module.exports = { oncePerConnection, ALREADY_CONNECTED };
