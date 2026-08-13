import express from 'express';
import { 
    getStations, 
    createStation, 
    updateStation, 
    deleteStation 
} from '../controllers/stationController';
import { isAuthenticated, isOwner } from '../middlewares/authMiddleware';

const router = express.Router();

router.use(isAuthenticated, isOwner);

router.get('/', getStations);
router.post('/', createStation);
router.put('/:id', updateStation);
router.delete('/:id', deleteStation);

export default router;
