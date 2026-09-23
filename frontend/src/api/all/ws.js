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

export const reconnectSocket = () => {
    if (!ws.connected) {
        ws.connect();
        return;
    }
    ws.io.once('close', () => ws.connect());
    ws.disconnect();
    setTimeout(() => {
        if (!ws.connected) {
            ws.connect();
        }
    }, RECONNECT_FALLBACK_MS);
};

export default ws;