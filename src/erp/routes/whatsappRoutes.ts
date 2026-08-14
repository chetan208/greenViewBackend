import express, { Request, Response } from 'express';
import { getWhatsAppStatus, logoutWhatsApp, sendWhatsAppMessage } from '../services/whatsappService';
import { isAuthenticated } from '../middlewares/authMiddleware';
import FeeAutomationSetting from '../../model/erpModels/feeAutomationSetting';
import { runFeeAutomation } from '../services/feeAutomationCron';

const router = express.Router();

// Get status and QR code
router.get('/status', (req: Request, res: Response): void => {
    try {
        const status = getWhatsAppStatus();
        res.status(200).json({ success: true, status });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Logout and restart session
router.post('/logout', isAuthenticated, async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await logoutWhatsApp();
        if (result.success) {
            res.status(200).json({ success: true, message: "WhatsApp logged out successfully." });
        } else {
            res.status(500).json({ success: false, error: result.error });
        }
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Manual test message
router.post('/send', isAuthenticated, async (req: Request, res: Response): Promise<void> => {
    try {
        const { number, message } = req.body;
        if (!number || !message) {
            res.status(400).json({ success: false, error: "Number and message are required" });
            return;
        }

        const result = await sendWhatsAppMessage(number, message);
        if (result.success) {
            res.status(200).json({ success: true, message: "Message sent" });
        } else {
            res.status(500).json({ success: false, error: result.error });
        }
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get automation settings
router.get('/automation-settings', isAuthenticated, async (req: Request, res: Response): Promise<void> => {
    try {
        let settings = await FeeAutomationSetting.findById('singleton');
        if (!settings) {
            settings = await FeeAutomationSetting.create({});
        }
        res.status(200).json({ success: true, settings });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update automation settings
router.post('/automation-settings', isAuthenticated, async (req: Request, res: Response): Promise<void> => {
    try {
        const { isEnabled, startDay, windowDays } = req.body;
        const settings = await FeeAutomationSetting.findByIdAndUpdate(
            'singleton',
            { isEnabled, startDay, windowDays },
            { new: true, upsert: true }
        );
        res.status(200).json({ success: true, settings });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Manually trigger automation (ignoreWindow=true)
router.post('/trigger-automation', isAuthenticated, async (req: Request, res: Response): Promise<void> => {
    try {
        // Run in background so request doesn't block
        runFeeAutomation(true).catch(console.error);
        res.status(200).json({ success: true, message: "Automation triggered in background" });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
