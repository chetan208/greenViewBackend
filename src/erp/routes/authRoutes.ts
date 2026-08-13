import express from 'express';
import { sendOtp, verifyOtp, getMe, updateMe, logout } from '../controllers/authController';
import { isAuthenticated } from '../middlewares/authMiddleware';

const router = express.Router();

router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.get('/me', isAuthenticated, getMe);
router.put('/me', isAuthenticated, updateMe);
router.post('/logout', isAuthenticated, logout);

export default router;
