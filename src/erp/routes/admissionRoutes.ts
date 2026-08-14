import express from 'express';
import { 
    submitApplication, 
    listApplications, 
    getApplication, 
    approveApplication, 
    rejectApplication, 
    getStats, 
    deleteApplication,
    downloadApplicationPdf,
    getPublicApplication
} from '../controllers/admissionController';
import { isAuthenticated, isAdmin, isOwner } from '../middlewares/authMiddleware';

import upload from '../../../config/upload';

const router = express.Router();

// Public route for submitting forms
router.post('/submit', upload.single('photoFile'), submitApplication);

// Public route for downloading PDF 
router.get('/:id/pdf', downloadApplicationPdf);

// Public route for fetching app data for PDF generation
router.get('/public/:id', getPublicApplication);

// Protected routes (Admin & Owner)
router.get('/', isAuthenticated, isAdmin, listApplications);
router.get('/stats', isAuthenticated, isAdmin, getStats);
router.get('/:id', isAuthenticated, isAdmin, getApplication);
router.post('/:id/approve', isAuthenticated, isAdmin, approveApplication);
router.post('/:id/reject', isAuthenticated, isAdmin, rejectApplication);

// Owner only
router.delete('/:id', isAuthenticated, isOwner, deleteApplication);

export default router;
