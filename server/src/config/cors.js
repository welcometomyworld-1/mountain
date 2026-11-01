import { config } from './config.js';

/**
 * Parses and returns a list of allowed origins from environment and defaults
 */
export const getAllowedOrigins = () => {
  const envOrigins = (config.clientUrl || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const defaults = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://localhost:8081',
    'http://172.16.1.140:5173',
    'capacitor://localhost',
  ];

  return Array.from(new Set([...envOrigins, ...defaults]));
};

/**
 * Dynamic CORS origin validator supporting:
 * - Configured CLIENT_URL (single or comma-separated)
 * - Vercel preview domains (*.vercel.app)
 * - Localhost and LAN IP addresses during development (192.168.*, 10.*, 172.16-31.*)
 * - Mobile applications and server-to-server requests without Origin header
 */
export const corsOriginValidator = (origin, callback) => {
  // Allow non-browser requests (mobile apps, curl, postman, server-to-server)
  if (!origin) {
    return callback(null, true);
  }

  const allowedOrigins = getAllowedOrigins();

  // Exact match
  if (allowedOrigins.includes(origin)) {
    return callback(null, true);
  }

  // Dynamic Vercel preview and production domain support (*.vercel.app)
  if (/^https:\/\/[a-zA-Z0-9_-]+\.vercel\.app$/.test(origin)) {
    return callback(null, true);
  }

  // Wildcard origin matching (e.g., https://*.example.com)
  const isWildcardMatch = allowedOrigins.some((pattern) => {
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
      return regex.test(origin);
    }
    return false;
  });

  if (isWildcardMatch) {
    return callback(null, true);
  }

  // Development mode: allow any localhost port or private LAN IP (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
  if (
    config.nodeEnv !== 'production' &&
    (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
     /^http:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$/.test(origin))
  ) {
    return callback(null, true);
  }

  console.warn(`[CORS] Blocked request from unauthorized origin: ${origin}`);
  return callback(new Error(`CORS policy blocked access from origin: ${origin}`), false);
};

export const corsOptions = {
  origin: corsOriginValidator,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
};
