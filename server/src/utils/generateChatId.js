import { User } from '../models/User.js';

/**
 * Generates a unique Chat ID formatted like 'CHAT482913'
 * Ensures no collisions by checking against existing users.
 */
export const generateUniqueChatId = async () => {
  let isUnique = false;
  let chatId = '';
  let attempts = 0;
  const maxAttempts = 15;

  while (!isUnique && attempts < maxAttempts) {
    attempts++;
    // Generate 6 random digits (100000 - 999999)
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    chatId = `CHAT${randomDigits}`;

    const existing = await User.findOne({ chatId }).lean();
    if (!existing) {
      isUnique = true;
    }
  }

  if (!isUnique) {
    // Fallback if 6 digits have collision (e.g. append timestamp slice)
    chatId = `CHAT${Date.now().toString().slice(-6)}`;
  }

  return chatId;
};
