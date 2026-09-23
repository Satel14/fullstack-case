const http = require('node:http');

const EVENT = /^42(\d*)(\[[\s\S]*\])$/;
const ACK = /^43(\d+)(\[[\s\S]*\])$/;

const startChatServer = async (attach) => {
    const server = http.createServer();
    attach(server);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    return { server, port: server.address().port };
};

const connectClient = (port, token) => new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/socket.io/?EIO=4&transport=websocket`);
    const received = [];
    const waiters = [];
    const acks = new Map();
    let nextAck = 0;

    const client = {
        received,
        events: (name) => received.filter(([event]) => event === name).map(([, payload]) => payload),
        emit: (event, ...args) => ws.send(`42${JSON.stringify([event, ...args])}`),
        request: (event, ...args) => new Promise((resolveAck) => {
            const id = nextAck;
            nextAck += 1;
            acks.set(id, resolveAck);
            ws.send(`42${id}${JSON.stringify([event, ...args])}`);
        }),
        waitFor: (name, predicate = () => true, timeoutMs = 3000) => new Promise((resolveWait, rejectWait) => {
            const found = received.find(([event, payload]) => event === name && predicate(payload));
            if (found) {
                resolveWait(found[1]);
                return;
            }
            const waiter = { name, predicate, resolve: resolveWait };
            waiters.push(waiter);
            setTimeout(() => {
                const index = waiters.indexOf(waiter);
                if (index !== -1) {
                    waiters.splice(index, 1);
                    rejectWait(new Error(`no '${name}' event within ${timeoutMs}ms`));
                }
            }, timeoutMs);
        }),
        close: () => new Promise((resolveClose) => {
            if (ws.readyState === WebSocket.CLOSED) {
                resolveClose();
                return;
            }
            ws.addEventListener('close', () => resolveClose(), { once: true });
            ws.close();
        }),
    };

    ws.addEventListener('error', () => reject(new Error('websocket error')));
    ws.addEventListener('message', ({ data }) => {
        const text = String(data);
        if (text === '2') {
            ws.send('3');
            return;
        }
        if (text.startsWith('0')) {
            ws.send(token ? `40${JSON.stringify({ token })}` : '40');
            return;
        }
        if (text.startsWith('40')) {
            resolve(client);
            return;
        }
        if (text.startsWith('44')) {
            reject(new Error(JSON.parse(text.slice(2)).message));
            return;
        }
        const ack = ACK.exec(text);
        if (ack) {
            const handler = acks.get(Number(ack[1]));
            acks.delete(Number(ack[1]));
            if (handler) {
                handler(JSON.parse(ack[2])[0]);
            }
            return;
        }
        const event = EVENT.exec(text);
        if (event) {
            const [name, payload] = JSON.parse(event[2]);
            received.push([name, payload]);
            for (const waiter of [...waiters]) {
                if (waiter.name === name && waiter.predicate(payload)) {
                    waiters.splice(waiters.indexOf(waiter), 1);
                    waiter.resolve(payload);
                }
            }
        }
    });
});

const settle = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = { startChatServer, connectClient, settle };
