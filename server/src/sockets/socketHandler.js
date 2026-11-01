import { Server } from 'socket.io';
import { socketAuthMiddleware } from '../middlewares/authMiddleware.js';
import { User } from '../models/User.js';
import { registerChatSocket } from './chatSocket.js';
import { registerCallSocket } from './callSocket.js';
import { config } from '../config/config.js';
import { corsOriginValidator } from '../config/cors.js';

export const initializeSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: corsOriginValidator,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // JWT Auth Middleware
  io.use(socketAuthMiddleware);

  io.on('connection', async (socket) => {
    const user = socket.user;
    const userId = user._id.toString();

    // Join personal user room and chatId room
    socket.join(`user_${userId}`);
    socket.join(`chat_${user.chatId}`);

    // Update user online status
    try {
      await User.findByIdAndUpdate(userId, {
        isOnline: true,
        lastSeen: new Date(),
      });

      // Broadcast user online status
      socket.broadcast.emit('user_status_changed', {
        userId,
        chatId: user.chatId,
        isOnline: true,
        lastSeen: new Date(),
      });
    } catch (err) {
      console.error('[Socket] Error updating user online status:', err);
    }

    // Register Chat & WebRTC Call event handlers
    registerChatSocket(io, socket);
    registerCallSocket(io, socket);

    // Handle Disconnect
    socket.on('disconnect', async () => {
      try {
        const lastSeen = new Date();
        await User.findByIdAndUpdate(userId, {
          isOnline: false,
          lastSeen,
        });

        socket.broadcast.emit('user_status_changed', {
          userId,
          chatId: user.chatId,
          isOnline: false,
          lastSeen,
        });
      } catch (err) {
        console.error('[Socket] Error updating user disconnect status:', err);
      }
    });
  });

  return io;
};
