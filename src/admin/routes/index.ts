import { Router } from 'express';
import { getNotices, createNotice, deleteNotice, updateNotice } from '@/admin/controllers/notices';
import {
    getFolders,
    getFolderById,
    createFolder,
    updateFolder,
    deleteFolder,
    getMedia,
    getMediaById,
    addMediaToFolder,
    addMultipleMediaToFolder,
    updateMedia,
    deleteMedia,
    deleteMultipleMedia
} from '@/admin/controllers/gallary';
import {
    getCalendarEvents,
    getCalendarEventById,
    createCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent
} from '@/admin/controllers/calander';
import {
    getStudyMaterials,
    getStudyMaterialById,
    createStudyMaterial,
    updateStudyMaterial,
    deleteStudyMaterial,
    seedDefaultStructure
} from '@/admin/controllers/studyMaterial';
import { createTopResult, deleteTopResult } from '@/admin/controllers/topResult';
import upload from '../../../config/upload';

const router = Router();

// ==================== NOTICE ROUTES ====================
router.get('/notices', getNotices);
router.post('/notice', upload.single('document'), createNotice);
router.put('/notice/:id', upload.single('document'), updateNotice);
router.delete('/notice/:id', deleteNotice);

// ==================== GALLERY FOLDER ROUTES ====================
router.get('/folders', getFolders);
router.get('/folder/:id', getFolderById);
router.post('/folder', createFolder);
router.put('/folder/:id', updateFolder);
router.delete('/folder/:id', deleteFolder);

// ==================== GALLERY MEDIA ROUTES ====================
router.get('/gallery', getMedia);
router.get('/gallery/:id', getMediaById);
router.post('/folder/:folderId/media', upload.single('media'), addMediaToFolder);
router.post('/folder/:folderId/media/batch', upload.array('media', 50), addMultipleMediaToFolder);
router.put('/gallery/:id', upload.single('media'), updateMedia);
router.delete('/gallery/:id', deleteMedia);
router.post('/gallery/batch-delete', deleteMultipleMedia);

// ==================== CALENDAR ROUTES ====================
router.get('/calendar', getCalendarEvents);
router.get('/calendar/:id', getCalendarEventById);
router.post('/calendar', createCalendarEvent);
router.put('/calendar/:id', updateCalendarEvent);
router.delete('/calendar/:id', deleteCalendarEvent);

// ==================== STUDY MATERIAL ADMIN ROUTES ====================
router.get('/study-materials', getStudyMaterials);
router.get('/study-material/:id', getStudyMaterialById);
router.post('/study-material', upload.single('pdf'), createStudyMaterial);
router.put('/study-material/:id', upload.single('pdf'), updateStudyMaterial);
router.delete('/study-material/:id', deleteStudyMaterial);
router.post('/study-material/seed-default', seedDefaultStructure);

// ==================== TOP RESULT ADMIN ROUTES ====================
router.post('/top-result', upload.single('image'), createTopResult);
router.delete('/top-result/:id', deleteTopResult);


// ==================== HERO IMAGE ADMIN ROUTES ====================
import { createHeroImage, deleteHeroImage, reorderHeroImages } from '../controllers/heroImage';
router.post('/hero-image', upload.single('image'), createHeroImage);
router.delete('/hero-image/:id', deleteHeroImage);
router.put('/hero-image/reorder', reorderHeroImages);

export default router;
