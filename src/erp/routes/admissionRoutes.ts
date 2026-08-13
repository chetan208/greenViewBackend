import express from 'express';
import { 
    submitApplication, 
    listApplications, 
    getApplication, 
    approveApplication, 
    rejectApplication, 
    getStats, 
    deleteApplication 
} from '../controllers/admissionController';
import { isAuthenticated, isAdmin, isOwner } from '../middlewares/authMiddleware';

const router = express.Router();

// Public route for submitting forms
router.post('/submit', submitApplication);

// Protected routes (Admin & Owner)
router.get('/', isAuthenticated, isAdmin, listApplications);
router.get('/stats', isAuthenticated, isAdmin, getStats);
router.get('/:id', isAuthenticated, isAdmin, getApplication);
router.post('/:id/approve', isAuthenticated, isAdmin, approveApplication);
router.post('/:id/reject', isAuthenticated, isAdmin, rejectApplication);

// Owner only
router.delete('/:id', isAuthenticated, isOwner, deleteApplication);

export default router;
