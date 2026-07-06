import io from "socket.io-client";

const WS_URL = process.env.REACT_APP_WS_URL || 'http://localhost:3003';

const ws = io(WS_URL, {
    transports: ["websocket"],
    withCredentials: true,
    reconnection: false,
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

export default ws;