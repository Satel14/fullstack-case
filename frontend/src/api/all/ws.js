import io from "socket.io-client";
import { API_URL } from '../config';

const ws = io(API_URL, {
    transports: ["websocket"],
    withCredentials: true,
    reconnection: false,
});

export default ws;