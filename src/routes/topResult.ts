import { Router } from 'express';
import { getTopResults } from '@/admin/controllers/topResult';

const router = Router();

// GET /api/top-results - List top results
router.get('/', getTopResults);

export default router;
