import { Message } from '../models/Message.js';
import { Conversation } from '../models/Conversation.js';
import { User } from '../models/User.js';
import { Group } from '../models/Group.js';

export const registerChatSocket = (io, socket) => {
  const currentUserId = socket.user._id.toString();

  // Join a specific conversation room
  socket.on('join_conversation', (conversationId) => {
    socket.join(`conv_${conversationId}`);
  });

  // Leave a specific conversation room
  socket.on('leave_conversation', (conversationId) => {
    socket.leave(`conv_${conversationId}`);
  });

  // Join a group room
  socket.on('join_group', (groupId) => {
    socket.join(`group_${groupId}`);
  });

  // Leave a group room
  socket.on('leave_group', (groupId) => {
    socket.leave(`group_${groupId}`);
  });

  // Real-time message sending
  socket.on('send_message', async (data, callback) => {
    try {
      const { conversationId, content, messageType, media, replyTo, isViewOnce } = data;

      const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: currentUserId,
      });

      if (!conversation) {
        if (callback) callback({ success: false, error: 'Conversation not found.' });
        return;
      }

      const recipientId = conversation.participants.find(
        (id) => id.toString() !== currentUserId
      ).toString();

      // Check block permissions
      const recipient = await User.findById(recipientId);
      if (!recipient || recipient.blockedUsers.includes(currentUserId)) {
        if (callback) callback({ success: false, error: 'Cannot send message to this user.' });
        return;
      }

      // Check if recipient is currently online
      const isRecipientInConv = io.sockets.adapter.rooms.get(`conv_${conversationId}`)?.size > 1;

      const message = await Message.create({
        conversation: conversationId,
        sender: currentUserId,
        recipient: recipientId,
        messageType: messageType || 'text',
        content: content || '',
        media: media || {},
        replyTo: replyTo || null,
        isViewOnce: Boolean(isViewOnce),
        status: isRecipientInConv ? 'delivered' : 'sent',
        deliveredAt: isRecipientInConv ? new Date() : null,
      });

      // Update conversation
      conversation.lastMessage = message._id;
      conversation.lastMessageAt = new Date();

      const currentUnread = conversation.unreadCounts?.get
        ? conversation.unreadCounts.get(recipientId) || 0
        : conversation.unreadCounts?.[recipientId] || 0;

      const newUnread = isRecipientInConv ? 0 : currentUnread + 1;

      if (conversation.unreadCounts?.set) {
        conversation.unreadCounts.set(recipientId, newUnread);
      } else {
        conversation.unreadCounts = {
          ...conversation.unreadCounts,
          [recipientId]: newUnread,
        };
      }

      await conversation.save();

      const populatedMessage = await Message.findById(message._id)
        .populate('sender', 'chatId displayName avatar')
        .populate('recipient', 'chatId displayName avatar');

      // Emit to conversation room (so everyone inside sees it)
      io.to(`conv_${conversationId}`).emit('new_message', {
        message: populatedMessage,
        conversationId,
      });

      // Also emit to recipient's personal room for conversation list & notification badge
      io.to(`user_${recipientId}`).emit('conversation_updated', {
        conversationId,
        lastMessage: populatedMessage,
        lastMessageAt: conversation.lastMessageAt,
        unreadIncrement: isRecipientInConv ? 0 : 1,
      });

      // Emit acknowledgment to sender
      if (callback) {
        callback({ success: true, message: populatedMessage });
      }
    } catch (err) {
      console.error('Socket send_message error:', err);
      if (callback) callback({ success: false, error: err.message });
    }
  });

  // Typing indicators
  socket.on('typing_start', ({ conversationId, targetUserId }) => {
    if (conversationId) {
      socket.to(`conv_${conversationId}`).emit('user_typing', {
        conversationId,
        userId: currentUserId,
        chatId: socket.user.chatId,
        displayName: socket.user.displayName,
      });
    } else if (targetUserId) {
      socket.to(`user_${targetUserId}`).emit('user_typing', {
        userId: currentUserId,
        chatId: socket.user.chatId,
        displayName: socket.user.displayName,
      });
    }
  });

  socket.on('typing_stop', ({ conversationId, targetUserId }) => {
    if (conversationId) {
      socket.to(`conv_${conversationId}`).emit('user_stop_typing', {
        conversationId,
        userId: currentUserId,
      });
    } else if (targetUserId) {
      socket.to(`user_${targetUserId}`).emit('user_stop_typing', {
        userId: currentUserId,
      });
    }
  });

  // Read receipts
  socket.on('mark_read', async ({ conversationId, targetUserId }) => {
    try {
      if (!conversationId) return;

      const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: currentUserId,
      });

      if (!conversation) return;

      if (conversation.unreadCounts?.set) {
        conversation.unreadCounts.set(currentUserId, 0);
      } else {
        conversation.unreadCounts = {
          ...conversation.unreadCounts,
          [currentUserId]: 0,
        };
      }
      await conversation.save();

      await Message.updateMany(
        {
          conversation: conversationId,
          recipient: currentUserId,
          status: { $ne: 'read' },
        },
        {
          $set: { status: 'read', readAt: new Date() },
        }
      );

      // Notify the sender that their messages have been read (for double blue ticks)
      const otherUserId = targetUserId || conversation.participants.find(
        (id) => id.toString() !== currentUserId
      ).toString();

      io.to(`user_${otherUserId}`).emit('messages_marked_read', {
        conversationId,
        readBy: currentUserId,
        readAt: new Date(),
      });
    } catch (err) {
      console.error('Socket mark_read error:', err);
    }
  });

  // Emoji reactions
  socket.on('send_reaction', async ({ messageId, conversationId, emoji }, callback) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) return;

      const existingIndex = message.reactions.findIndex(
        (r) => r.user.toString() === currentUserId
      );

      if (existingIndex > -1) {
        if (message.reactions[existingIndex].emoji === emoji) {
          message.reactions.splice(existingIndex, 1);
        } else {
          message.reactions[existingIndex].emoji = emoji;
          message.reactions[existingIndex].createdAt = new Date();
        }
      } else {
        message.reactions.push({
          user: currentUserId,
          emoji,
          createdAt: new Date(),
        });
      }

      await message.save();

      const updated = await Message.findById(messageId).populate(
        'reactions.user',
        'chatId displayName avatar'
      );

      io.to(`conv_${conversationId}`).emit('reaction_updated', {
        messageId,
        conversationId,
        reactions: updated.reactions,
      });

      if (callback) callback({ success: true, reactions: updated.reactions });
    } catch (err) {
      console.error('Socket send_reaction error:', err);
      if (callback) callback({ success: false, error: err.message });
    }
  });

  // Delete message event
  socket.on('delete_message', async ({ messageId, conversationId, deleteType }, callback) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) return;

      if (deleteType === 'for_everyone') {
        if (message.sender.toString() !== currentUserId) {
          if (callback) callback({ success: false, error: 'Unauthorized.' });
          return;
        }

        message.isDeletedForEveryone = true;
        message.deletedAt = new Date();
        await message.save();

        io.to(`conv_${conversationId}`).emit('message_deleted_for_everyone', {
          messageId,
          conversationId,
        });

        if (callback) callback({ success: true });
      }
    } catch (err) {
      console.error('Socket delete_message error:', err);
      if (callback) callback({ success: false, error: err.message });
    }
  });

  // Group real-time message sending
  socket.on('send_group_message', async (data, callback) => {
    try {
      const { groupId, content, messageType, media, replyTo, isViewOnce } = data;

      const group = await Group.findOne({
        _id: groupId,
        members: currentUserId,
      });

      if (!group) {
        if (callback) callback({ success: false, error: 'Group not found or not a member.' });
        return;
      }

      const message = await Message.create({
        group: groupId,
        isGroup: true,
        sender: currentUserId,
        messageType: messageType || 'text',
        content: content || '',
        media: media || {},
        replyTo: replyTo || null,
        isViewOnce: Boolean(isViewOnce),
        status: 'sent',
      });

      group.lastMessage = message._id;
      group.lastMessageAt = new Date();

      // Update unread count for other members
      group.members.forEach((mId) => {
        const idStr = mId.toString();
        if (idStr !== currentUserId) {
          const curr = group.unreadCounts?.get
            ? group.unreadCounts.get(idStr) || 0
            : group.unreadCounts?.[idStr] || 0;
          if (group.unreadCounts?.set) {
            group.unreadCounts.set(idStr, curr + 1);
          } else if (group.unreadCounts) {
            group.unreadCounts[idStr] = curr + 1;
          }
        }
      });

      await group.save();

      const populatedMessage = await Message.findById(message._id)
        .populate('sender', 'chatId displayName avatar');

      // Emit to group room
      io.to(`group_${groupId}`).emit('new_group_message', {
        message: populatedMessage,
        groupId,
      });

      // Emit to each member's personal room to update group list preview & badge
      group.members.forEach((mId) => {
        const idStr = mId.toString();
        if (idStr !== currentUserId) {
          io.to(`user_${idStr}`).emit('group_updated', {
            groupId,
            lastMessage: populatedMessage,
            lastMessageAt: group.lastMessageAt,
          });
        }
      });

      if (callback) callback({ success: true, message: populatedMessage });
    } catch (err) {
      console.error('Socket send_group_message error:', err);
      if (callback) callback({ success: false, error: err.message });
    }
  });

  // Real-time View-Once opened event
  socket.on('view_once_opened', ({ messageId, conversationId, groupId }) => {
    const room = groupId ? `group_${groupId}` : `conv_${conversationId}`;
    io.to(room).emit('view_once_opened', {
      messageId,
      openedBy: currentUserId,
      viewedAt: new Date(),
    });
  });
};

