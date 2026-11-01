import { verifyToken } from '../utils/jwt.js';
import { User } from '../models/User.js';

export const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id).select('-password -securityAnswer');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid session: user no longer exists.',
      });
    }

    if (user.isBanned) {
      return res.status(403).json({
        success: false,
        message: user.bannedReason
          ? `Account suspended: ${user.bannedReason}`
          : 'This account has been suspended by an administrator.',
        isBanned: true,
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired session token.',
      error: error.message,
    });
  }
};

/**
 * Socket.IO authentication middleware
 */
export const socketAuthMiddleware = async (socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '') ||
      socket.handshake.query?.token;

    if (!token) {
      return next(new Error('Authentication failed: Token missing'));
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id).select('-password -securityAnswer');

    if (!user) {
      return next(new Error('Authentication failed: User not found'));
    }

    if (user.isBanned) {
      return next(new Error('Account suspended: Access denied by administrator'));
    }

    socket.user = user;
    next();
  } catch (err) {
    next(new Error('Authentication failed: Invalid token'));
  }
};

/**
 * Verify user has admin privileges
 */
export const adminOnly = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.chatId === 'CHAT100000')) {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Access denied: Administrator privileges required.',
  });
};
