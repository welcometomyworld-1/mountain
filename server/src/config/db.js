import mongoose from 'mongoose';
import net from 'net';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { config } from './config.js';

const isPortOpen = (port) => {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1200);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, '127.0.0.1');
  });
};

export const connectDB = async () => {
  try {
    const targetUri = config.mongoUri || 'mongodb://127.0.0.1:27017/mountain_car_game';
    const isLocalUri = targetUri.includes('127.0.0.1') || targetUri.includes('localhost');

    // In local development with local URI, ensure mongod is running
    if (config.nodeEnv !== 'production' && isLocalUri) {
      const dataDir = path.resolve('data/db');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      const is27017Listening = await isPortOpen(27017);
      if (!is27017Listening) {
        console.log('[DB] Port 27017 not active. Spawning standalone mongod daemon for local dev...');
        const mongodBinPath = path.resolve(
          'node_modules/.cache/mongodb-memory-server/mongod-x64-win32-7.0.24.exe'
        );

        if (fs.existsSync(mongodBinPath)) {
          const mongodProc = spawn(
            mongodBinPath,
            ['--dbpath', dataDir, '--port', '27017', '--bind_ip', '127.0.0.1'],
            {
              detached: true,
              stdio: 'ignore',
            }
          );
          mongodProc.unref();

          // Wait up to 5 seconds for port to open
          let attempts = 0;
          while (attempts < 10) {
            await new Promise((r) => setTimeout(r, 500));
            if (await isPortOpen(27017)) {
              console.log('✅ Standalone mongod daemon started and listening on 27017.');
              break;
            }
            attempts++;
          }
        }
      } else {
        console.log('✅ Found active MongoDB service listening on port 27017.');
      }
    }

    const options = {
      serverSelectionTimeoutMS: 8000,
    };

    // Sanitize credentials when logging connection string
    const safeLogUri = targetUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
    console.log(`[DB] Connecting to MongoDB: ${safeLogUri}`);

    try {
      await mongoose.connect(targetUri, options);
      console.log('✅ Connected to MongoDB successfully.');
    } catch (primaryErr) {
      console.warn(`⚠️ Primary MongoDB connection failed (${primaryErr.message}).`);
      
      // In non-production, attempt local fallback if configured
      if (config.nodeEnv !== 'production') {
        const fallbackUri = process.env.MONGODB_FALLBACK_URI || 'mongodb://127.0.0.1:27017/mountain_car_game';
        if (targetUri !== fallbackUri) {
          console.log(`[DB] Attempting fallback to local MongoDB at: ${fallbackUri}`);
          await mongoose.connect(fallbackUri, options);
          console.log('✅ Connected to fallback local MongoDB successfully.');
          return;
        }
      }
      throw primaryErr;
    }
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    process.exit(1);
  }
};

export const closeDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('[DB] Database connection closed.');
  } catch (err) {
    console.error('[DB] Error closing database:', err);
  }
};
