const socketIo = require('socket.io');

let io = null;

module.exports = {
    init: (server) => {
        io = socketIo(server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
                credentials: true
            }
        });

        io.on('connection', (socket) => {
            console.log(`🔌 Client connected to Socket.IO: ${socket.id}`);

            // Allow clients to join rooms (e.g. 'admin' room)
            socket.on('join-room', (room) => {
                socket.join(room);
                console.log(`👤 Socket ${socket.id} joined room: ${room}`);
            });

            socket.on('disconnect', () => {
                console.log(`🔌 Client disconnected from Socket.IO: ${socket.id}`);
            });
        });

        return io;
    },
    getIO: () => {
        return io;
    },
    emitToAdmin: (event, data) => {
        if (io) {
            io.to('admin').emit(event, data);
            console.log(`📡 Broadcasted event '${event}' to admin room:`, data);
        } else {
            console.warn(`⚠️ Cannot emit '${event}': Socket.IO is not initialized!`);
        }
    },
    emitToUser: (userId, event, data) => {
        if (io && userId) {
            const userRoom = `user_${userId.toString()}`;
            io.to(userRoom).emit(event, data);
            // Also emit globally with userId attached for broad customer listener compatibility
            io.emit(event, { ...data, targetUserId: userId.toString() });
            console.log(`📡 Broadcasted event '${event}' to user ${userId}:`, data);
        } else if (!io) {
            console.warn(`⚠️ Cannot emit '${event}': Socket.IO is not initialized!`);
        }
    },
    emitToRoom: (room, event, data) => {
        if (io && room) {
            io.to(room).emit(event, data);
            console.log(`📡 Broadcasted event '${event}' to room ${room}:`, data);
        } else if (!io) {
            console.warn(`⚠️ Cannot emit '${event}': Socket.IO is not initialized!`);
        }
    }
};
