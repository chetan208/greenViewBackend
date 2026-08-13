import { Router } from 'express';
import {
    getStudyMaterials,
    getAcademicStructure,
    getStudyMaterialById,
    incrementDownloadCount,
    incrementViewCount
} from '@/admin/controllers/studyMaterial';

const router = Router();

// ==================== PUBLIC STUDY MATERIAL ROUTES ====================
// GET /api/study-material - List & search materials with filters (className, subjectName, type, search)
router.get('/', getStudyMaterials);

// GET /api/study-material/structure - Get classes & subjects tree with real counts
router.get('/structure', getAcademicStructure);

// GET /api/study-material/:id - Get single material detail
router.get('/:id', getStudyMaterialById);

// POST /api/study-material/:id/download - Track downloads
router.post('/:id/download', incrementDownloadCount);

// POST /api/study-material/:id/view - Track views
router.post('/:id/view', incrementViewCount);

export default router;
