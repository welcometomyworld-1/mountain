import { User } from '../models/User.js';
import { generateUniqueChatId } from '../utils/generateChatId.js';
import { signToken } from '../utils/jwt.js';

export const register = async (req, res, next) => {
  try {
    const { displayName, password, securityQuestion, securityAnswer, avatar, bio } = req.body;

    if (!displayName || !password || !securityQuestion || !securityAnswer) {
      return res.status(400).json({
        success: false,
        message: 'Please provide display name, password, security question, and answer.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    // Generate unique Chat ID e.g. CHAT482913
    const chatId = await generateUniqueChatId();

    const user = await User.create({
      chatId,
      displayName: displayName.trim(),
      password,
      securityQuestion: securityQuestion.trim(),
      securityAnswer: securityAnswer.trim(),
      avatar: avatar || '',
      bio: bio ? bio.trim() : 'Available on PrivateID',
    });

    const token = signToken({ id: user._id, chatId: user.chatId });

    res.status(201).json({
      success: true,
      message: `Account created successfully! Your unique Chat ID is ${chatId}`,
      chatId,
      token,
      user: user.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { chatId, password } = req.body;

    if (!chatId || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both your Chat ID and password.',
      });
    }

    const formattedChatId = chatId.toUpperCase().trim();
    const user = await User.findOne({ chatId: formattedChatId });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Chat ID or password.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Chat ID or password.',
      });
    }

    if (user.isBanned) {
      return res.status(403).json({
        success: false,
        message: user.bannedReason
          ? `Account suspended: ${user.bannedReason}`
          : 'This account has been suspended by an administrator.',
      });
    }

    const token = signToken({ id: user._id, chatId: user.chatId });

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: user.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
};

export const getSecurityQuestion = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    if (!chatId) {
      return res.status(400).json({
        success: false,
        message: 'Chat ID is required.',
      });
    }

    const formattedChatId = chatId.toUpperCase().trim();
    const user = await User.findOne({ chatId: formattedChatId });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this Chat ID.',
      });
    }

    res.status(200).json({
      success: true,
      chatId: user.chatId,
      securityQuestion: user.securityQuestion,
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { chatId, securityAnswer, newPassword } = req.body;

    if (!chatId || !securityAnswer || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide Chat ID, security answer, and new password.',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.',
      });
    }

    const formattedChatId = chatId.toUpperCase().trim();
    const user = await User.findOne({ chatId: formattedChatId });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this Chat ID.',
      });
    }

    const isAnswerCorrect = await user.compareSecurityAnswer(securityAnswer);
    if (!isAnswerCorrect) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect answer to security question.',
      });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successfully. You can now log in with your new password.',
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('contacts.user', 'chatId displayName avatar isOnline lastSeen bio privacySettings')
      .populate('blockedUsers', 'chatId displayName avatar');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    res.status(200).json({
      success: true,
      user: user.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { displayName, avatar, bio, privacySettings } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    if (displayName) user.displayName = displayName.trim();
    if (avatar !== undefined) user.avatar = avatar;
    if (bio !== undefined) user.bio = bio.trim();
    if (privacySettings) {
      if (privacySettings.profileVisibility) {
        user.privacySettings.profileVisibility = privacySettings.profileVisibility;
      }
      if (privacySettings.onlineStatus) {
        user.privacySettings.onlineStatus = privacySettings.onlineStatus;
      }
      if (privacySettings.lastSeen) {
        user.privacySettings.lastSeen = privacySettings.lastSeen;
      }
      if (privacySettings.readReceipts !== undefined) {
        user.privacySettings.readReceipts = Boolean(privacySettings.readReceipts);
      }
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: user.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
};
