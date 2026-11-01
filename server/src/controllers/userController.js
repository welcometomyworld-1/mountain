import { User } from '../models/User.js';

/**
 * Find a single user by exact Chat ID only.
 * Protects user privacy by NEVER exposing full user directory or fuzzy search.
 */
export const searchByChatId = async (req, res, next) => {
  try {
    const { chatId } = req.query;

    if (!chatId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an exact Chat ID.',
      });
    }

    const formattedChatId = chatId.toUpperCase().trim();

    if (formattedChatId === req.user.chatId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot search for your own Chat ID.',
      });
    }

    const targetUser = await User.findOne({ chatId: formattedChatId })
      .select('chatId displayName avatar bio isOnline lastSeen privacySettings blockedUsers');

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'No user found with this exact Chat ID.',
      });
    }

    // Check if target user has blocked current user
    const hasBlockedMe = targetUser.blockedUsers.some(
      (id) => id.toString() === req.user._id.toString()
    );

    if (hasBlockedMe) {
      return res.status(404).json({
        success: false,
        message: 'No user found with this exact Chat ID.',
      });
    }

    // Check if current user has blocked target
    const isBlocked = req.user.blockedUsers.some(
      (id) => id.toString() === targetUser._id.toString()
    );

    // Check if target is already in contacts
    const isContact = req.user.contacts.some(
      (c) => c.user.toString() === targetUser._id.toString()
    );

    // Respect target user's privacy settings for lastSeen / isOnline
    let canSeeStatus = true;
    if (targetUser.privacySettings?.lastSeen === 'nobody') {
      canSeeStatus = false;
    } else if (targetUser.privacySettings?.lastSeen === 'contacts') {
      const targetContacts = await User.findById(targetUser._id).select('contacts');
      const isMutualContact = targetContacts?.contacts?.some(
        (c) => c.user.toString() === req.user._id.toString()
      );
      if (!isMutualContact) canSeeStatus = false;
    }

    res.status(200).json({
      success: true,
      user: {
        _id: targetUser._id,
        chatId: targetUser.chatId,
        displayName: targetUser.displayName,
        avatar: targetUser.avatar,
        bio: targetUser.bio,
        isOnline: canSeeStatus ? targetUser.isOnline : false,
        lastSeen: canSeeStatus ? targetUser.lastSeen : null,
        isContact,
        isBlocked,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const addContact = async (req, res, next) => {
  try {
    const { targetUserId, nickname } = req.body;

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'Target user ID is required.',
      });
    }

    if (targetUserId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot add yourself as a contact.',
      });
    }

    const targetUser = await User.findById(targetUserId).select('chatId displayName avatar isOnline lastSeen bio');
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    const currentUser = await User.findById(req.user._id);

    // Check if already in contacts
    const existingIndex = currentUser.contacts.findIndex(
      (c) => c.user.toString() === targetUserId
    );

    if (existingIndex > -1) {
      // Update nickname if provided
      if (nickname !== undefined) {
        currentUser.contacts[existingIndex].nickname = nickname.trim();
        await currentUser.save();
      }
      return res.status(200).json({
        success: true,
        message: 'Contact updated.',
        contact: {
          user: targetUser,
          nickname: currentUser.contacts[existingIndex].nickname,
          addedAt: currentUser.contacts[existingIndex].addedAt,
        },
      });
    }

    currentUser.contacts.push({
      user: targetUserId,
      nickname: nickname ? nickname.trim() : targetUser.displayName,
      addedAt: new Date(),
    });

    await currentUser.save();

    res.status(201).json({
      success: true,
      message: 'Contact added successfully.',
      contact: {
        user: targetUser,
        nickname: nickname ? nickname.trim() : targetUser.displayName,
        addedAt: new Date(),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const removeContact = async (req, res, next) => {
  try {
    const { targetUserId } = req.params;

    const currentUser = await User.findById(req.user._id);
    currentUser.contacts = currentUser.contacts.filter(
      (c) => c.user.toString() !== targetUserId
    );

    await currentUser.save();

    res.status(200).json({
      success: true,
      message: 'Contact removed.',
      targetUserId,
    });
  } catch (error) {
    next(error);
  }
};

export const blockUser = async (req, res, next) => {
  try {
    const { targetUserId } = req.body;

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'Target user ID is required.',
      });
    }

    const currentUser = await User.findById(req.user._id);

    if (!currentUser.blockedUsers.includes(targetUserId)) {
      currentUser.blockedUsers.push(targetUserId);
      await currentUser.save();
    }

    res.status(200).json({
      success: true,
      message: 'User blocked.',
      targetUserId,
    });
  } catch (error) {
    next(error);
  }
};

export const unblockUser = async (req, res, next) => {
  try {
    const { targetUserId } = req.params;

    const currentUser = await User.findById(req.user._id);
    currentUser.blockedUsers = currentUser.blockedUsers.filter(
      (id) => id.toString() !== targetUserId
    );

    await currentUser.save();

    res.status(200).json({
      success: true,
      message: 'User unblocked.',
      targetUserId,
    });
  } catch (error) {
    next(error);
  }
};

export const getContacts = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate(
      'contacts.user',
      'chatId displayName avatar isOnline lastSeen bio privacySettings'
    );

    res.status(200).json({
      success: true,
      contacts: user.contacts,
    });
  } catch (error) {
    next(error);
  }
};

export const getBlockedUsers = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate(
      'blockedUsers',
      'chatId displayName avatar'
    );

    res.status(200).json({
      success: true,
      blockedUsers: user.blockedUsers || [],
    });
  } catch (error) {
    next(error);
  }
};


