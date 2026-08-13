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

const router = express.Router();

// All student routes require Owner access (ERP)
router.use(isAuthenticated, isOwner);

router.post('/', createStudent);
router.get('/', getStudents);
router.get('/next-roll-no', getNextRollNo);
router.get('/:id', getStudentById);
router.put('/:id', updateStudent);
router.delete('/:id', deleteStudent);
router.post('/:id/promote', promoteStudent);

export default router;
