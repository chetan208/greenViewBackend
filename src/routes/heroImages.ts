import { Router } from 'express';
import { getHeroImages } from '../admin/controllers/heroImage';

const router = Router();

// GET /api/hero-images
router.get('/', getHeroImages);

export default router;
