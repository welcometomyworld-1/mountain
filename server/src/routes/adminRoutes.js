import express from 'express';
import { protect, adminOnly } from '../middlewares/authMiddleware.js';
import {
  getAdminStats,
  getAdminUsers,
  toggleBanUser,
  resetUserPassword,
  deleteUser,
  getAdminCalls,
  getAdminGroups,
  sendSystemBroadcast,
} from '../controllers/adminController.js';

const router = express.Router();

// All admin routes require valid token AND admin privileges
router.use(protect, adminOnly);

router.get('/stats', getAdminStats);
router.get('/users', getAdminUsers);
router.post('/users/:userId/toggle-ban', toggleBanUser);
router.post('/users/:userId/reset-password', resetUserPassword);
router.delete('/users/:userId', deleteUser);
router.get('/calls', getAdminCalls);
router.get('/groups', getAdminGroups);
router.post('/broadcast', sendSystemBroadcast);

export default router;
