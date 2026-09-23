import io from "socket.io-client";

const WS_URL = process.env.REACT_APP_WS_URL || 'http://localhost:3003';

const ws = io(WS_URL, {
    transports: ["websocket"],
    withCredentials: true,
    auth: (cb) => {
        let token = null;
        try {
            token = localStorage.getItem('token');
        } catch (e) {
            token = null;
        }
        cb({ token });
    },
});

const RECONNECT_FALLBACK_MS = 1000;
const SESSION_CHECK_RETRY_MS = 2000;

ws.on('connect_error', (error) => {
    if (error && error.message === 'session check failed') {
        setTimeout(() => ws.connect(), SESSION_CHECK_RETRY_MS);
    }
});

export const reconnectSocket = () => {
    if (!ws.connected) {
        ws.connect();
        return;
    }
    let reconnected = false;
    const connectOnce = () => {
        if (!reconnected) {
            reconnected = true;
            ws.connect();
        }
    };
    ws.io.once('close', () => setTimeout(connectOnce, 0));
    ws.disconnect();
    setTimeout(connectOnce, RECONNECT_FALLBACK_MS);
};

export default ws;