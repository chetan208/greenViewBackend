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

// GET methods are public, other methods (POST, PUT, DELETE) require Owner access
router.get('/', getTeachers);
router.get('/:id', getTeacherById);

router.post('/', isAuthenticated, isOwner, upload.single('photo'), createTeacher);
router.put('/:id', isAuthenticated, isOwner, upload.single('photo'), updateTeacher);
router.delete('/:id', isAuthenticated, isOwner, deleteTeacher);

export default router;
