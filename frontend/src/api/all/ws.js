import io from "socket.io-client";

const WS_URL = 'http://localhost:3003';

const ws = io(WS_URL, {
    transports: ["websocket"],
    withCredentials: true,
    reconnection: false,
});

export default ws;