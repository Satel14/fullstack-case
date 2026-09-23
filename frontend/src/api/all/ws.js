import io from "socket.io-client";

const WS_URL = process.env.REACT_APP_WS_URL || 'http://localhost:3003';

const storedToken = () => {
    try {
        return localStorage.getItem('token');
    } catch (e) {
        return null;
    }
};

let handshakeToken = null;

const ws = io(WS_URL, {
    transports: ["websocket"],
    withCredentials: true,
    auth: (cb) => {
        handshakeToken = storedToken();
        cb({ token: handshakeToken });
    },
});

const RECONNECT_FALLBACK_MS = 1000;
const SESSION_CHECK_RETRY_MS = 2000;

let handshakePending = true;
let retryTimer = null;

export const connectSocket = () => {
    if (ws.connected || handshakePending) {
        return;
    }
    handshakePending = true;
    ws.connect();
};

export const reconnectSocket = () => {
    if (!ws.connected) {
        connectSocket();
        return;
    }
    let reconnected = false;
    const connectOnce = () => {
        if (!reconnected) {
            reconnected = true;
            connectSocket();
        }
    };
    ws.io.once('close', () => setTimeout(connectOnce, 0));
    ws.disconnect();
    setTimeout(connectOnce, RECONNECT_FALLBACK_MS);
};

ws.io.on('open', () => {
    handshakePending = true;
});

ws.on('connect', () => {
    handshakePending = false;
    clearTimeout(retryTimer);
    retryTimer = null;
    if (handshakeToken !== storedToken()) {
        setTimeout(reconnectSocket, 0);
    }
});

ws.on('disconnect', () => {
    handshakePending = false;
});

ws.on('connect_error', (error) => {
    handshakePending = false;
    if (error && error.message === 'session check failed') {
        clearTimeout(retryTimer);
        retryTimer = setTimeout(() => {
            retryTimer = null;
            connectSocket();
        }, SESSION_CHECK_RETRY_MS);
    }
});

export default ws;