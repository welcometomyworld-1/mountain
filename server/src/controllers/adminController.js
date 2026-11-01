import { User } from '../models/User.js';
import { Message } from '../models/Message.js';
import { Group } from '../models/Group.js';
import { CallLog } from '../models/CallLog.js';
import { Conversation } from '../models/Conversation.js';

/**
 * Get overall platform statistics for admin dashboard
 */
export const getAdminStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      onlineUsersCount,
      bannedUsersCount,
      totalMessages,
      totalGroups,
      totalCalls,
      videoCallsCount,
      audioCallsCount,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isOnline: true }),
      User.countDocuments({ isBanned: true }),
      Message.countDocuments(),
      Group.countDocuments(),
      CallLog.countDocuments(),
      CallLog.countDocuments({ callType: 'video' }),
      CallLog.countDocuments({ callType: 'audio' }),
    ]);

    // Currently online users
    const onlineUsers = await User.find(
      { isOnline: true },
      'chatId displayName avatar bio lastSeen createdAt role isBanned'
    )
      .sort({ updatedAt: -1 })
      .limit(20);

    // Recent registered users
    const recentUsers = await User.find(
      {},
      'chatId displayName avatar isOnline lastSeen createdAt role isBanned'
    )
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        onlineUsersCount,
        bannedUsersCount,
        totalMessages,
        totalGroups,
        totalCalls,
        videoCallsCount,
        audioCallsCount,
      },
      onlineUsers,
      recentUsers,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get users with search, status filters, and pagination
 */
export const getAdminUsers = async (req, res, next) => {
  try {
    const { search = '', filter = 'all', page = 1, limit = 50 } = req.query;

    const query = {};

    if (search.trim()) {
      const s = search.trim();
      query.$or = [
        { chatId: { $regex: s, $options: 'i' } },
        { displayName: { $regex: s, $options: 'i' } },
      ];
    }

    if (filter === 'online') {
      query.isOnline = true;
    } else if (filter === 'offline') {
      query.isOnline = false;
    } else if (filter === 'banned') {
      query.isBanned = true;
    } else if (filter === 'admin') {
      query.role = 'admin';
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const [users, total] = await Promise.all([
      User.find(query, '-password -securityAnswer')
        .sort({ isOnline: -1, lastSeen: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10)),
      User.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      users,
      total,
      page: parseInt(page, 10),
      pages: Math.ceil(total / parseInt(limit, 10)) || 1,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle user ban status
 */
export const toggleBanUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { reason = '' } = req.body;

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Safety: Protect superadmin & self
    if (targetUser.chatId === 'CHAT100000' || targetUser._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot ban an administrator account.' });
    }

    targetUser.isBanned = !targetUser.isBanned;
    targetUser.bannedReason = targetUser.isBanned ? reason || 'Violated terms of service' : '';
    if (targetUser.isBanned) {
      targetUser.isOnline = false;
    }
    await targetUser.save();

    // If banned, force disconnect user socket if connected
    const io = req.app.get('io');
    if (io && targetUser.isBanned) {
      const userRoom = `user:${targetUser._id}`;
      io.to(userRoom).emit('account_banned', {
        message: targetUser.bannedReason,
      });
      // Disconnect matching sockets
      const sockets = await io.in(userRoom).fetchSockets();
      sockets.forEach((s) => s.disconnect(true));
    }

    res.status(200).json({
      success: true,
      message: targetUser.isBanned
        ? `User ${targetUser.displayName} (${targetUser.chatId}) has been suspended.`
        : `User ${targetUser.displayName} (${targetUser.chatId}) has been unbanned.`,
      user: targetUser.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset a user's password directly from the admin panel
 */
export const resetUserPassword = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Safety: only superadmin can reset superadmin
    if (targetUser.chatId === 'CHAT100000' && req.user.chatId !== 'CHAT100000') {
      return res.status(403).json({ success: false, message: 'Cannot reset superadmin password.' });
    }

    targetUser.password = newPassword;
    await targetUser.save();

    res.status(200).json({
      success: true,
      message: `Password for ${targetUser.displayName} (${targetUser.chatId}) has been updated.`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a user account completely (cleanup groups, conversations)
 */
export const deleteUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (targetUser.chatId === 'CHAT100000' || targetUser._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot delete superadmin or own account.' });
    }

    const io = req.app.get('io');
    if (io) {
      const userRoom = `user:${targetUser._id}`;
      io.to(userRoom).emit('account_deleted', { message: 'Your account was deleted by an administrator.' });
      const sockets = await io.in(userRoom).fetchSockets();
      sockets.forEach((s) => s.disconnect(true));
    }

    // Delete user
    await User.findByIdAndDelete(userId);

    // Remove user from any group members
    await Group.updateMany({ members: userId }, { $pull: { members: userId, admins: userId } });

    res.status(200).json({
      success: true,
      message: `User ${targetUser.displayName} (${targetUser.chatId}) permanently deleted.`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get call history logs for auditing
 */
export const getAdminCalls = async (req, res, next) => {
  try {
    const { limit = 50 } = req.query;

    const calls = await CallLog.find()
      .populate('caller', 'chatId displayName avatar')
      .populate('recipient', 'chatId displayName avatar')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10));

    res.status(200).json({
      success: true,
      calls,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get groups for auditing
 */
export const getAdminGroups = async (req, res, next) => {
  try {
    const groups = await Group.find()
      .populate('creator', 'chatId displayName')
      .populate('members', 'chatId displayName isOnline')
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      groups,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Send real-time broadcast alert to all online users
 */
export const sendSystemBroadcast = async (req, res, next) => {
  try {
    const { title, message, type = 'info' } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Broadcast message content is required.' });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('system_broadcast', {
        id: Date.now().toString(),
        title: title ? title.trim() : 'Platform Announcement',
        message: message.trim(),
        type: ['info', 'warning', 'urgent', 'success'].includes(type) ? type : 'info',
        sender: `${req.user.displayName} (Admin)`,
        timestamp: new Date().toISOString(),
      });
    }

    res.status(200).json({
      success: true,
      message: 'System broadcast delivered successfully to all connected users.',
    });
  } catch (error) {
    next(error);
  }
};
