import express from 'express';
import { 
    getStudentFees, 
    updateFeeStructure, 
    listFeeStructures,
    getFeeStats,
    getIncomeAnalysis
} from '../controllers/feeController';
import { isAuthenticated, isOwner } from '../middlewares/authMiddleware';

const router = express.Router();

router.use(isAuthenticated, isOwner);

router.get('/students/:studentSessionId', getStudentFees);
router.put('/:feeId', updateFeeStructure);
router.get('/list', listFeeStructures);
router.get('/stats', getFeeStats);
router.get('/income-analysis', getIncomeAnalysis);

export default router;
