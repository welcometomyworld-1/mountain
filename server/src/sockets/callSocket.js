import crypto from 'crypto';
import { CallLog } from '../models/CallLog.js';

// In-memory call session management
const activeCalls = new Map(); // userId -> callId
const callSessions = new Map(); // callId -> { callerId, recipientId, callType, status, createdAt, connectedAt }

const logCallSafely = async (data) => {
  try {
    if (data.caller && data.recipient) {
      await CallLog.create(data);
    }
  } catch (err) {
    console.error('[CallLog] Failed to persist call log:', err);
  }
};

export const registerCallSocket = (io, socket) => {
  const currentUserId = socket.user._id.toString();

  // Initiate call to recipient
  socket.on('call_user', async ({ recipientUserId, callType, offer }, callback) => {
    try {
      const recipientRoom = io.sockets.adapter.rooms.get(`user_${recipientUserId}`);
      const isRecipientOnline = recipientRoom && recipientRoom.size > 0;

      if (!isRecipientOnline) {
        if (callback) callback({ success: false, reason: 'offline' });
        socket.emit('call_failed', { reason: 'offline', message: 'User is currently offline.' });
        return;
      }

      // Check if recipient is already in a call
      if (activeCalls.has(recipientUserId)) {
        if (callback) callback({ success: false, reason: 'busy' });
        socket.emit('call_failed', { reason: 'busy', message: 'User is busy on another call.' });
        return;
      }

      // Check if caller is already in a call
      if (activeCalls.has(currentUserId)) {
        if (callback) callback({ success: false, reason: 'already_in_call' });
        socket.emit('call_failed', { reason: 'already_in_call', message: 'You are already in an active call.' });
        return;
      }

      const callId = `call_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

      // Register session
      const sessionData = {
        callId,
        callerId: currentUserId,
        recipientId: recipientUserId,
        callType: callType || 'video',
        status: 'ringing',
        createdAt: new Date(),
      };

      callSessions.set(callId, sessionData);
      activeCalls.set(currentUserId, callId);
      activeCalls.set(recipientUserId, callId);

      // Emit incoming call to recipient
      io.to(`user_${recipientUserId}`).emit('incoming_call', {
        callId,
        caller: {
          _id: socket.user._id,
          chatId: socket.user.chatId,
          displayName: socket.user.displayName,
          avatar: socket.user.avatar,
        },
        callType: callType || 'video',
        offer,
      });

      if (callback) {
        callback({ success: true, callId });
      }
    } catch (err) {
      console.error('Socket call_user error:', err);
      if (callback) callback({ success: false, error: err.message });
    }
  });

  // Accept incoming call
  socket.on('accept_call', ({ callId, callerUserId, answer }, callback) => {
    try {
      const session = callSessions.get(callId);
      if (!session) {
        if (callback) callback({ success: false, error: 'Call session expired.' });
        return;
      }

      session.status = 'connected';
      session.connectedAt = new Date();

      // Emit answer back to caller
      io.to(`user_${callerUserId}`).emit('call_accepted', {
        callId,
        answer,
        recipient: {
          _id: socket.user._id,
          chatId: socket.user.chatId,
          displayName: socket.user.displayName,
          avatar: socket.user.avatar,
        },
      });

      if (callback) callback({ success: true });
    } catch (err) {
      console.error('Socket accept_call error:', err);
      if (callback) callback({ success: false, error: err.message });
    }
  });

  // Reject incoming call
  socket.on('reject_call', ({ callId, callerUserId, reason }) => {
    try {
      const session = callSessions.get(callId);
      if (session) {
        logCallSafely({
          caller: session.callerId,
          recipient: session.recipientId,
          callType: session.callType || 'audio',
          status: reason === 'busy' ? 'busy' : 'declined',
          duration: 0,
        });

        activeCalls.delete(session.callerId);
        activeCalls.delete(session.recipientId);
        callSessions.delete(callId);
      }

      io.to(`user_${callerUserId}`).emit('call_rejected', {
        callId,
        reason: reason || 'declined',
        message: reason === 'busy' ? 'User is busy.' : 'Call declined.',
      });
    } catch (err) {
      console.error('Socket reject_call error:', err);
    }
  });

  // Relay ICE candidate
  socket.on('ice_candidate', ({ targetUserId, candidate, callId }) => {
    if (targetUserId && candidate) {
      io.to(`user_${targetUserId}`).emit('ice_candidate', {
        candidate,
        callId,
        fromUserId: currentUserId,
      });
    }
  });

  // End active call
  socket.on('end_call', ({ callId, targetUserId }) => {
    try {
      const session = callId ? callSessions.get(callId) : null;
      if (session) {
        const duration = session.connectedAt
          ? Math.max(1, Math.round((Date.now() - new Date(session.connectedAt).getTime()) / 1000))
          : 0;

        logCallSafely({
          caller: session.callerId,
          recipient: session.recipientId,
          callType: session.callType || 'audio',
          status: session.connectedAt ? 'completed' : 'missed',
          duration,
        });

        activeCalls.delete(session.callerId);
        activeCalls.delete(session.recipientId);
        callSessions.delete(callId);
      } else {
        activeCalls.delete(currentUserId);
        if (targetUserId) activeCalls.delete(targetUserId);
      }

      if (targetUserId) {
        io.to(`user_${targetUserId}`).emit('call_ended', {
          callId,
          reason: 'hangup',
          message: 'Call ended.',
        });
      }
    } catch (err) {
      console.error('Socket end_call error:', err);
    }
  });

  // Media state changes (mute mic / camera toggle / screen share)
  socket.on('media_state_change', ({ targetUserId, isVideoMuted, isAudioMuted, isScreenSharing }) => {
    if (targetUserId) {
      io.to(`user_${targetUserId}`).emit('peer_media_state_changed', {
        fromUserId: currentUserId,
        isVideoMuted,
        isAudioMuted,
        isScreenSharing,
      });
    }
  });

  // Clean up if user disconnects during a call
  socket.on('disconnect', () => {
    const activeCallId = activeCalls.get(currentUserId);
    if (activeCallId) {
      const session = callSessions.get(activeCallId);
      if (session) {
        const duration = session.connectedAt
          ? Math.max(1, Math.round((Date.now() - new Date(session.connectedAt).getTime()) / 1000))
          : 0;

        logCallSafely({
          caller: session.callerId,
          recipient: session.recipientId,
          callType: session.callType || 'audio',
          status: session.connectedAt ? 'completed' : 'missed',
          duration,
        });

        const peerId = session.callerId === currentUserId ? session.recipientId : session.callerId;
        io.to(`user_${peerId}`).emit('call_ended', {
          callId: activeCallId,
          reason: 'disconnected',
          message: 'Call ended because peer disconnected.',
        });
        activeCalls.delete(peerId);
        callSessions.delete(activeCallId);
      }
      activeCalls.delete(currentUserId);
    }
  });
};
