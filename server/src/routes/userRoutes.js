import express from 'express';
import {
  searchByChatId,
  addContact,
  removeContact,
  blockUser,
  unblockUser,
  getContacts,
  getBlockedUsers,
} from '../controllers/userController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/search', searchByChatId);
router.get('/contacts', getContacts);
router.post('/contacts', addContact);
router.delete('/contacts/:targetUserId', removeContact);
router.get('/blocked', getBlockedUsers);
router.post('/block', blockUser);
router.delete('/block/:targetUserId', unblockUser);

export default router;
