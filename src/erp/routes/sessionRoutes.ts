import express from 'express';
import { 
    getSessions, 
    createSession, 
    updateSession 
} from '../controllers/sessionController';
import { isAuthenticated, isOwner } from '../middlewares/authMiddleware';

const router = express.Router();

router.use(isAuthenticated, isOwner);

router.get('/', getSessions);
router.post('/', createSession);
router.put('/:id', updateSession);

export default router;
