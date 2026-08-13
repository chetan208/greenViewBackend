import express from 'express';
import { 
    getClasses,
    createClass,
    updateClass, 
    updateClassDefaults, 
    getMonthlyOverrides, 
    updateMonthlyOverride 
} from '../controllers/classController';
import { isAuthenticated, isOwner } from '../middlewares/authMiddleware';

const router = express.Router();

// Class routes require Owner access
router.use(isAuthenticated, isOwner);

router.get('/', getClasses);
router.post('/', createClass);
router.put('/:id', updateClass);
router.post('/fees', updateClassDefaults);
router.get('/monthly-fees', getMonthlyOverrides);
router.post('/monthly-fees', updateMonthlyOverride);

export default router;
