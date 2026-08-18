import express from 'express';
import { 
    getRoutes, 
    createRoute, 
    updateRoute, 
    deleteRoute 
} from '../controllers/routeController';
import { isAuthenticated, isOwner } from '../middlewares/authMiddleware';

const router = express.Router();

// All transport routes require Owner access (ERP)
router.use(isAuthenticated, isOwner);

router.get('/', getRoutes);
router.post('/', createRoute);
router.put('/:id', updateRoute);
router.delete('/:id', deleteRoute);

export default router;
