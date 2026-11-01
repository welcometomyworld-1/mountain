import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';

import { config } from './config/config.js';
import { connectDB } from './config/db.js';
import { initializeSocket } from './sockets/socketHandler.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import groupRoutes from './routes/groupRoutes.js';
import callRoutes from './routes/callRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { User } from './models/User.js';
import { notFound, errorHandler } from './middlewares/errorHandler.js';
import { apiLimiter } from './middlewares/rateLimiter.js';

import { corsOptions } from './config/cors.js';

const app = express();
const server = http.createServer(app);

// Initialize WebSockets
const io = initializeSocket(server);
app.set('io', io);

// Security & Parsing Middlewares
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(cors(corsOptions));

app.use(morgan('dev'));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Apply rate limiting to general API routes
app.use('/api', apiLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'PrivateID Messaging & Video Calling Platform',
  });
});

// STUN/TURN configuration endpoint for WebRTC clients
app.get('/api/webrtc/ice-servers', (req, res) => {
  const iceServers = [
    {
      urls: [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
        'stun:stun3.l.google.com:19302',
        'stun:stun4.l.google.com:19302',
        'stun:global.stun.twilio.com:3478',
        'stun:stun.cloudflare.com:3478',
      ],
    },
  ];

  if (config.turn.url) {
    const urls = config.turn.url.includes(',')
      ? config.turn.url.split(',').map((u) => u.trim()).filter(Boolean)
      : config.turn.url;

    const turnConfig = { urls };
    if (config.turn.username) turnConfig.username = config.turn.username;
    if (config.turn.credential) turnConfig.credential = config.turn.credential;
    iceServers.push(turnConfig);
  }

  res.status(200).json({
    success: true,
    iceServers,
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/admin', adminRoutes);

// 404 & Global Error Handlers
app.use(notFound);
app.use(errorHandler);

// Connect DB & Start Server
const startServer = async () => {
  await connectDB();

  // Ensure superadmin ADMIN (and CHAT100000) exists with role: 'admin' and password: 'admin123'
  try {
    let admin = await User.findOne({ chatId: 'ADMIN' });
    if (!admin) {
      admin = new User({
        chatId: 'ADMIN',
        displayName: 'System Admin',
        password: 'admin123',
        role: 'admin',
        securityQuestion: 'What is the system secret key?',
        securityAnswer: 'admin123',
        bio: 'Mountain Car Game Administrator',
      });
      await admin.save();
      console.log('👑 Admin user initialized: Chat ID: ADMIN | Password: admin123');
    } else {
      admin.role = 'admin';
      admin.password = 'admin123';
      await admin.save();
      console.log('👑 Admin user verified: Chat ID: ADMIN | Password: admin123');
    }

    await User.updateOne({ chatId: 'CHAT100000' }, { $set: { role: 'admin' } });
  } catch (err) {
    console.warn('Could not auto-set admin user:', err.message);
  }

  const HOST = process.env.HOST || '0.0.0.0';
  server.listen(config.port, HOST, () => {
    console.log(`🚀 PrivateID Server running in ${config.nodeEnv} mode on ${HOST}:${config.port}`);
    console.log(`📡 WebSocket & Signaling server ready`);
    console.log(`🛡️ Admin API endpoints mounted at /api/admin`);
    console.log(`🌐 Allowed client origin(s): ${config.clientUrl}`);
  });
};

startServer();

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
});
