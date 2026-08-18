import express from 'express';
import { 
    createStudent, 
    getStudents, 
    getStudentById, 
    updateStudent, 
    deleteStudent, 
    promoteStudent, 
    getNextRollNo 
} from '../controllers/studentController';
import { isAuthenticated, isOwner } from '../middlewares/authMiddleware';
import upload from '../../../config/upload';

const router = express.Router();

// All student routes require Owner access (ERP)
router.use(isAuthenticated, isOwner);

router.post('/', upload.single('profileImage'), createStudent);
router.get('/', getStudents);
router.get('/next-roll-no', getNextRollNo);
router.get('/:id', getStudentById);
router.put('/:id', upload.single('profileImage'), updateStudent);
router.delete('/:id', deleteStudent);
router.post('/:id/promote', promoteStudent);

export default router;
