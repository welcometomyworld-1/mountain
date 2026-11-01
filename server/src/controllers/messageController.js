import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { User } from '../models/User.js';
import { Group } from '../models/Group.js';

/**
 * Fetch all conversations for current user
 */
export const getConversations = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;

    const conversations = await Conversation.find({
      participants: currentUserId,
    })
      .populate('participants', 'chatId displayName avatar isOnline lastSeen bio privacySettings')
      .populate('lastMessage')
      .sort({ lastMessageAt: -1 });

    // Format list: identify the other participant & calculate unread count
    // Filter out conversations deleted by current user unless new messages arrived after deletion
    const activeConversations = conversations.filter((conv) => {
      const deletedEntry = conv.deletedFor?.find(
        (entry) => entry.user?.toString() === currentUserId.toString()
      );
      if (!deletedEntry) return true;
      return conv.lastMessageAt && new Date(conv.lastMessageAt) > new Date(deletedEntry.deletedAt);
    });

    const formatted = activeConversations.map((conv) => {
      const otherParticipant = conv.participants.find(
        (p) => p._id.toString() !== currentUserId.toString()
      );

      const unreadCount = conv.unreadCounts?.get
        ? conv.unreadCounts.get(currentUserId.toString()) || 0
        : conv.unreadCounts?.[currentUserId.toString()] || 0;

      return {
        _id: conv._id,
        participant: otherParticipant || null,
        lastMessage: conv.lastMessage || null,
        lastMessageAt: conv.lastMessageAt,
        unreadCount,
        updatedAt: conv.updatedAt,
      };
    });

    res.status(200).json({
      success: true,
      conversations: formatted,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get or create a 1-to-1 conversation with another user
 */
export const getOrCreateConversation = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;
    const { targetUserId, targetChatId } = req.body;

    let otherUser;
    if (targetUserId) {
      otherUser = await User.findById(targetUserId);
    } else if (targetChatId) {
      otherUser = await User.findOne({ chatId: targetChatId.toUpperCase().trim() });
    }

    if (!otherUser) {
      return res.status(404).json({
        success: false,
        message: 'Target user not found.',
      });
    }

    if (otherUser._id.toString() === currentUserId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create conversation with yourself.',
      });
    }

    // Check block status
    if (
      req.user.blockedUsers.includes(otherUser._id) ||
      otherUser.blockedUsers.includes(currentUserId)
    ) {
      return res.status(403).json({
        success: false,
        message: 'Unable to start conversation due to privacy/blocking settings.',
      });
    }

    // Find existing conversation
    let conversation = await Conversation.findOne({
      participants: { $all: [currentUserId, otherUser._id], $size: 2 },
    })
      .populate('participants', 'chatId displayName avatar isOnline lastSeen bio privacySettings')
      .populate('lastMessage');

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [currentUserId, otherUser._id],
        unreadCounts: {
          [currentUserId.toString()]: 0,
          [otherUser._id.toString()]: 0,
        },
      });

      conversation = await Conversation.findById(conversation._id)
        .populate('participants', 'chatId displayName avatar isOnline lastSeen bio privacySettings');
    }

    const otherParticipant = conversation.participants.find(
      (p) => p._id.toString() !== currentUserId.toString()
    );

    const unreadCount = conversation.unreadCounts?.get
      ? conversation.unreadCounts.get(currentUserId.toString()) || 0
      : conversation.unreadCounts?.[currentUserId.toString()] || 0;

    res.status(200).json({
      success: true,
      conversation: {
        _id: conversation._id,
        participant: otherParticipant,
        lastMessage: conversation.lastMessage || null,
        lastMessageAt: conversation.lastMessageAt,
        unreadCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch messages in a conversation
 */
export const getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const currentUserId = req.user._id;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: currentUserId,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found or access denied.',
      });
    }

    // Check if user cleared or deleted chat history
    const clearedEntry = conversation.clearedFor?.find(
      (entry) => entry.user?.toString() === currentUserId.toString()
    );
    const deletedEntry = conversation.deletedFor?.find(
      (entry) => entry.user?.toString() === currentUserId.toString()
    );

    const filterTimestamps = [clearedEntry?.clearedAt, deletedEntry?.deletedAt]
      .filter(Boolean)
      .map((d) => new Date(d).getTime());

    const query = {
      conversation: conversationId,
      deletedFor: { $ne: currentUserId },
    };

    if (filterTimestamps.length > 0) {
      const latestCutoff = Math.max(...filterTimestamps);
      query.createdAt = { $gt: new Date(latestCutoff) };
    }

    const messages = await Message.find(query)
      .populate('sender', 'chatId displayName avatar')
      .populate('reactions.user', 'chatId displayName avatar')
      .sort({ createdAt: 1 });

    // Format deleted messages
    const formattedMessages = messages.map((m) => {
      const msgObj = m.toObject();
      if (msgObj.isDeletedForEveryone) {
        msgObj.content = 'This message was deleted';
        msgObj.media = null;
        msgObj.replyTo = null;
      }
      return msgObj;
    });

    res.status(200).json({
      success: true,
      messages: formattedMessages,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Send a message via HTTP
 */
export const sendMessage = async (req, res, next) => {
  try {
    const { conversationId, content, messageType, media, replyTo, isViewOnce } = req.body;
    const currentUserId = req.user._id;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: currentUserId,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found or unauthorized.',
      });
    }

    const recipientId = conversation.participants.find(
      (id) => id.toString() !== currentUserId.toString()
    );

    // Verify recipient has not blocked sender
    const recipient = await User.findById(recipientId);
    if (!recipient || recipient.blockedUsers.includes(currentUserId)) {
      return res.status(403).json({
        success: false,
        message: 'Cannot send message to this user.',
      });
    }

    const message = await Message.create({
      conversation: conversationId,
      sender: currentUserId,
      recipient: recipientId,
      messageType: messageType || 'text',
      content: content || '',
      media: media || {},
      replyTo: replyTo || null,
      isViewOnce: Boolean(isViewOnce),
      status: 'sent',
    });

    // Update conversation
    conversation.lastMessage = message._id;
    conversation.lastMessageAt = new Date();

    const currentUnread = conversation.unreadCounts?.get
      ? conversation.unreadCounts.get(recipientId.toString()) || 0
      : conversation.unreadCounts?.[recipientId.toString()] || 0;

    if (conversation.unreadCounts?.set) {
      conversation.unreadCounts.set(recipientId.toString(), currentUnread + 1);
    } else {
      conversation.unreadCounts = {
        ...conversation.unreadCounts,
        [recipientId.toString()]: currentUnread + 1,
      };
    }

    await conversation.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'chatId displayName avatar')
      .populate('recipient', 'chatId displayName avatar');

    res.status(201).json({
      success: true,
      message: populatedMessage,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add emoji reaction to message
 */
export const addReaction = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const currentUserId = req.user._id;

    if (!emoji) {
      return res.status(400).json({
        success: false,
        message: 'Emoji is required.',
      });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found.',
      });
    }

    // Check existing reaction by this user
    const existingIndex = message.reactions.findIndex(
      (r) => r.user.toString() === currentUserId.toString()
    );

    if (existingIndex > -1) {
      // If clicking same emoji, toggle/remove it; otherwise change it
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

    res.status(200).json({
      success: true,
      reactions: updated.reactions,
      messageId,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete message (for me or for everyone)
 */
export const deleteMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { deleteType } = req.body; // 'for_me' or 'for_everyone'
    const currentUserId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found.',
      });
    }

    if (deleteType === 'for_everyone') {
      if (message.sender.toString() !== currentUserId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Only the sender can delete a message for everyone.',
        });
      }

      message.isDeletedForEveryone = true;
      message.deletedAt = new Date();
      await message.save();

      return res.status(200).json({
        success: true,
        message: 'Message deleted for everyone.',
        messageId,
        deleteType: 'for_everyone',
      });
    }

    // Default: delete for me
    if (!message.deletedFor.includes(currentUserId)) {
      message.deletedFor.push(currentUserId);
      await message.save();
    }

    res.status(200).json({
      success: true,
      message: 'Message deleted for you.',
      messageId,
      deleteType: 'for_me',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark messages in conversation as read
 */
export const markAsRead = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const currentUserId = req.user._id;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: currentUserId,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found.',
      });
    }

    // Reset current user's unread count
    if (conversation.unreadCounts?.set) {
      conversation.unreadCounts.set(currentUserId.toString(), 0);
    } else {
      conversation.unreadCounts = {
        ...conversation.unreadCounts,
        [currentUserId.toString()]: 0,
      };
    }
    await conversation.save();

    // Update unread messages sent by the other participant
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

    res.status(200).json({
      success: true,
      message: 'Conversation marked as read.',
      conversationId,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Clear chat history for current user
 */
export const clearConversation = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const currentUserId = req.user._id;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: currentUserId,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found.',
      });
    }

    const existingIdx = conversation.clearedFor.findIndex(
      (entry) => entry.user?.toString() === currentUserId.toString()
    );

    if (existingIdx > -1) {
      conversation.clearedFor[existingIdx].clearedAt = new Date();
    } else {
      conversation.clearedFor.push({
        user: currentUserId,
        clearedAt: new Date(),
      });
    }

    await conversation.save();

    res.status(200).json({
      success: true,
      message: 'Chat history cleared for you.',
      conversationId,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete entire conversation for the current user (WhatsApp-style Delete Chat)
 * Hides conversation from chat list and marks messages as deleted for current user
 */
export const deleteConversation = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const currentUserId = req.user._id;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: currentUserId,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found.',
      });
    }

    const deleteTimestamp = new Date();

    // 1. Mark conversation as deleted for current user
    if (!conversation.deletedFor) conversation.deletedFor = [];
    const existingIdx = conversation.deletedFor.findIndex(
      (entry) => entry.user?.toString() === currentUserId.toString()
    );

    if (existingIdx > -1) {
      conversation.deletedFor[existingIdx].deletedAt = deleteTimestamp;
    } else {
      conversation.deletedFor.push({
        user: currentUserId,
        deletedAt: deleteTimestamp,
      });
    }

    // 2. Also set clearedFor so all past messages are cleared
    if (!conversation.clearedFor) conversation.clearedFor = [];
    const clearedIdx = conversation.clearedFor.findIndex(
      (entry) => entry.user?.toString() === currentUserId.toString()
    );

    if (clearedIdx > -1) {
      conversation.clearedFor[clearedIdx].clearedAt = deleteTimestamp;
    } else {
      conversation.clearedFor.push({
        user: currentUserId,
        clearedAt: deleteTimestamp,
      });
    }

    // 3. Reset unread count for current user
    if (conversation.unreadCounts?.set) {
      conversation.unreadCounts.set(currentUserId.toString(), 0);
    } else {
      conversation.unreadCounts = {
        ...conversation.unreadCounts,
        [currentUserId.toString()]: 0,
      };
    }

    await conversation.save();

    // 4. Mark all messages in this conversation as deleted for this user
    await Message.updateMany(
      { conversation: conversationId },
      { $addToSet: { deletedFor: currentUserId } }
    );

    res.status(200).json({
      success: true,
      message: 'Conversation deleted successfully.',
      conversationId,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch messages for a group
 */
export const getGroupMessages = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const currentUserId = req.user._id;

    const group = await Group.findOne({
      _id: groupId,
      members: currentUserId,
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found or you are not a member.',
      });
    }

    // Reset current user's unread count for this group
    if (group.unreadCounts?.set) {
      group.unreadCounts.set(currentUserId.toString(), 0);
    } else if (group.unreadCounts) {
      group.unreadCounts[currentUserId.toString()] = 0;
    }
    await group.save();

    const messages = await Message.find({
      group: groupId,
      deletedFor: { $ne: currentUserId },
    })
      .populate('sender', 'chatId displayName avatar')
      .populate('reactions.user', 'chatId displayName avatar')
      .sort({ createdAt: 1 });

    const formattedMessages = messages.map((m) => {
      const msgObj = m.toObject();
      if (msgObj.isDeletedForEveryone) {
        msgObj.content = 'This message was deleted';
        msgObj.media = null;
        msgObj.replyTo = null;
      }
      return msgObj;
    });

    res.status(200).json({
      success: true,
      messages: formattedMessages,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Send message to a group via HTTP
 */
export const sendGroupMessage = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { content, messageType, media, replyTo, isViewOnce } = req.body;
    const currentUserId = req.user._id;

    const group = await Group.findOne({
      _id: groupId,
      members: currentUserId,
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found or you are not a member.',
      });
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

    // Increment unread count for all members except sender
    group.members.forEach((mId) => {
      const idStr = mId.toString();
      if (idStr !== currentUserId.toString()) {
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

    const populated = await Message.findById(message._id)
      .populate('sender', 'chatId displayName avatar');

    res.status(201).json({
      success: true,
      message: populated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Search messages with filters (text, attachment type, date range)
 */
export const searchMessages = async (req, res, next) => {
  try {
    const { q, type, conversationId, groupId, startDate, endDate } = req.query;
    const currentUserId = req.user._id;

    const filter = {
      deletedFor: { $ne: currentUserId },
      isDeletedForEveryone: { $ne: true },
    };

    if (conversationId) {
      const conv = await Conversation.findOne({
        _id: conversationId,
        participants: currentUserId,
      });
      if (!conv) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }
      filter.conversation = conversationId;
    } else if (groupId) {
      const group = await Group.findOne({
        _id: groupId,
        members: currentUserId,
      });
      if (!group) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }
      filter.group = groupId;
    } else {
      // Search in all conversations & groups the user belongs to
      const [userConvs, userGroups] = await Promise.all([
        Conversation.find({ participants: currentUserId }).select('_id'),
        Group.find({ members: currentUserId }).select('_id'),
      ]);

      filter.$or = [
        { conversation: { $in: userConvs.map((c) => c._id) } },
        { group: { $in: userGroups.map((g) => g._id) } },
      ];
    }

    if (type && type !== 'all') {
      filter.messageType = type;
    }

    if (q && q.trim()) {
      filter.$or = filter.$or
        ? [
            ...filter.$or,
            { content: { $regex: q.trim(), $options: 'i' } },
            { 'media.fileName': { $regex: q.trim(), $options: 'i' } },
          ]
        : [
            { content: { $regex: q.trim(), $options: 'i' } },
            { 'media.fileName': { $regex: q.trim(), $options: 'i' } },
          ];
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const messages = await Message.find(filter)
      .populate('sender', 'chatId displayName avatar')
      .populate('recipient', 'chatId displayName avatar')
      .sort({ createdAt: -1 })
      .limit(100);

    res.status(200).json({
      success: true,
      resultsCount: messages.length,
      messages,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Open a View-Once media message
 */
export const openViewOnce = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const currentUserId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found.' });
    }

    if (!message.isViewOnce) {
      return res.status(400).json({ success: false, message: 'Message is not a view-once media.' });
    }

    // Check if current user already viewed this message
    const alreadyViewed = message.viewedBy.some(
      (v) => v.user.toString() === currentUserId.toString()
    );

    if (alreadyViewed) {
      return res.status(410).json({
        success: false,
        message: 'This media has already been opened and cannot be viewed again.',
        isOpened: true,
      });
    }

    // Record view
    message.viewedBy.push({
      user: currentUserId,
      viewedAt: new Date(),
    });

    await message.save();

    // Notify sender or conversation via Socket
    const io = req.app.get('io');
    if (io) {
      const room = message.isGroup ? `group_${message.group}` : `conv_${message.conversation}`;
      io.to(room).emit('view_once_opened', {
        messageId: message._id,
        openedBy: currentUserId,
        viewedAt: new Date(),
      });
    }

    res.status(200).json({
      success: true,
      message: 'View-once media opened.',
      media: message.media,
      viewedAt: new Date(),
    });
  } catch (error) {
    next(error);
  }
};

