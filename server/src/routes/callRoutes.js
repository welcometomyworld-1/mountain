import express from 'express';
import { getCallLogs, createCallLog, clearCallLogs } from '../controllers/callController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getCallLogs);
router.post('/', createCallLog);
router.delete('/', clearCallLogs);

export default router;
