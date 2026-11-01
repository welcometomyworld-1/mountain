import express from 'express';
import {
  getConversations,
  getOrCreateConversation,
  getMessages,
  sendMessage,
  addReaction,
  deleteMessage,
  markAsRead,
  clearConversation,
  deleteConversation,
  getGroupMessages,
  sendGroupMessage,
  searchMessages,
  openViewOnce,
} from '../controllers/messageController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/conversations', getConversations);
router.post('/conversations', getOrCreateConversation);
router.get('/conversations/:conversationId/messages', getMessages);
router.post('/messages', sendMessage);
router.post('/send', sendMessage);

router.put('/conversations/:conversationId/read', markAsRead);
router.delete('/conversations/:conversationId/clear', clearConversation);
router.delete('/conversations/:conversationId', deleteConversation);
router.post('/messages/:messageId/reaction', addReaction);
router.delete('/messages/:messageId', deleteMessage);

// Message search endpoint (filter by query, type, dates, conversation/group)
router.get('/search', searchMessages);

// Group messaging endpoints
router.get('/groups/:groupId/messages', getGroupMessages);
router.post('/groups/:groupId/messages', sendGroupMessage);

// View-once open endpoint
router.post('/:messageId/view-once', openViewOnce);

export default router;

