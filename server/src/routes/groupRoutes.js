import express from 'express';
import {
  createGroup,
  getUserGroups,
  getGroupDetails,
  addMemberByChatId,
  removeMember,
  leaveGroup,
} from '../controllers/groupController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.post('/', createGroup);
router.get('/', getUserGroups);
router.get('/:groupId', getGroupDetails);
router.post('/:groupId/members', addMemberByChatId);
router.delete('/:groupId/members/:memberId', removeMember);
router.post('/:groupId/leave', leaveGroup);

export default router;
