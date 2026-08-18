import express from 'express';
import { 
    createTeacher, 
    getTeachers, 
    getTeacherById, 
    updateTeacher, 
    deleteTeacher 
} from '../controllers/teacherController';
import { isAuthenticated, isOwner } from '../middlewares/authMiddleware';
import upload from '../../../config/upload';

const router = express.Router();

// All teacher routes require Owner access
router.use(isAuthenticated, isOwner);

router.post('/', upload.single('photo'), createTeacher);
router.get('/', getTeachers);
router.get('/:id', getTeacherById);
router.put('/:id', upload.single('photo'), updateTeacher);
router.delete('/:id', deleteTeacher);

export default router;
