import { io } from 'socket.io-client';
import useSignalStore from '../stores/signalStore';

let socket = null;
let connectionAttempted = false;

export const getSocket = () => {
    if (socket) return socket;
    if (connectionAttempted) return null; // Don't retry if previous attempt failed permanently
    connectionAttempted = true;

    // Retrieve the base API URL
    const apiUrl = import.meta.env.VITE_API_URL || useSignalStore.getState().getApiUrl() || 'http://localhost:5000';
    
    // Normalize url for websocket server (removing trailing slash or /api)
    const socketUrl = apiUrl.replace(/\/api\/?$/, '');

    socket = io(socketUrl, {
        autoConnect: false,
        reconnection: true,
        reconnectionAttempts: 5,          // Reduced: stop spamming after 5 tries
        reconnectionDelay: 5000,          // Wait 5s between retries
        reconnectionDelayMax: 30000,      // Cap at 30s
        timeout: 10000,
        transports: ['polling', 'websocket'] // Try polling first (Vercel-compatible), then upgrade to WS
    });

    socket.on('connect', () => {
        console.log(`🔌 Socket.IO connected: ${socket.id}`);
    });

    socket.on('disconnect', (reason) => {
        console.log(`🔌 Socket.IO disconnected: ${reason}`);
    });

    socket.on('connect_error', (err) => {
        // Only log once, don't spam the console
        if (socket.io.reconnectionAttempts <= 1) {
            console.warn(`⚠️ Real-time sync unavailable (this is expected on serverless deployments): ${err.message}`);
        }
    });

    socket.on('reconnect_failed', () => {
        console.warn('⚠️ Real-time Socket.IO unavailable. The app will continue to work normally — data will refresh on page interactions.');
        socket = null;            // Reset so future calls can try again after navigation
        connectionAttempted = false;
    });

    socket.connect();
    return socket;
};

export const resetSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
    connectionAttempted = false;
};
