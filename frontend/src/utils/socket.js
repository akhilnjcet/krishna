import { io } from 'socket.io-client';
import useSignalStore from '../stores/signalStore';

let socket = null;

export const getSocket = () => {
    if (socket) return socket;

    // Retrieve the base API URL
    const apiUrl = import.meta.env.VITE_API_URL || useSignalStore.getState().getApiUrl() || 'http://localhost:5000';
    
    // Normalize url for websocket server (removing trailing slash or /api)
    const socketUrl = apiUrl.replace(/\/api\/?$/, '');

    console.log(`🔌 Connecting to Socket.IO Server at: ${socketUrl}`);

    socket = io(socketUrl, {
        autoConnect: false,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 3000,
        transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
        console.log(`🔌 Socket.IO client connected! ID: ${socket.id}`);
    });

    socket.on('disconnect', (reason) => {
        console.log(`🔌 Socket.IO client disconnected: ${reason}`);
    });

    socket.on('connect_error', (err) => {
        console.error(`🔌 Socket.IO connection error:`, err.message);
    });

    return socket;
};
