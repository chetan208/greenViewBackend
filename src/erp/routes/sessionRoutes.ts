import express from 'express';
import { 
    getSessions, 
    createSession, 
    updateSession,
    getAdmissionStatus,
    toggleAdmissionStatus
} from '../controllers/sessionController';
import { isAuthenticated, isOwner } from '../middlewares/authMiddleware';

const router = express.Router();

// Public route
router.get('/public/admission-status', getAdmissionStatus);

// Protected routes
router.use(isAuthenticated, isOwner);
router.get('/', getSessions);
router.post('/', createSession);
router.put('/:id', updateSession);
router.post('/:id/toggle-admissions', toggleAdmissionStatus);

export default router;
