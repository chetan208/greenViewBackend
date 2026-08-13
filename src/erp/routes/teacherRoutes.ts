import express from 'express';
import { 
    createTeacher, 
    getTeachers, 
    getTeacherById, 
    updateTeacher, 
    deleteTeacher 
} from '../controllers/teacherController';
import { isAuthenticated, isOwner } from '../middlewares/authMiddleware';

const router = express.Router();

// All teacher routes require Owner access
router.use(isAuthenticated, isOwner);

router.post('/', createTeacher);
router.get('/', getTeachers);
router.get('/:id', getTeacherById);
router.put('/:id', updateTeacher);
router.delete('/:id', deleteTeacher);

export default router;
