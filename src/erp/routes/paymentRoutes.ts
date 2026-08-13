import express from 'express';
import { makePayment, getReceipt } from '../controllers/paymentController';
import { isAuthenticated, isOwner } from '../middlewares/authMiddleware';

const router = express.Router();

router.post('/make-payment', isAuthenticated, isOwner, makePayment);
// Public receipt access
router.get('/receipt/public/:id', getReceipt);

export default router;
