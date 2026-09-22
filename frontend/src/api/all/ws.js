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

export const reconnectSocket = () => {
    ws.disconnect();
    ws.connect();
};

export default ws;