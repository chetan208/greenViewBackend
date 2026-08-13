import express from 'express';
import { 
    getSettings, 
    updateSettings, 
    getLogs, 
    triggerAutomation, 
    getStatus 
} from '../controllers/feeAutomationController';
import { isAuthenticated, isOwner } from '../middlewares/authMiddleware';

const router = express.Router();

router.use(isAuthenticated, isOwner);

router.get('/settings', getSettings);
router.put('/settings', updateSettings);
router.get('/logs', getLogs);
router.post('/trigger', triggerAutomation);
router.get('/status', getStatus);

export default router;
