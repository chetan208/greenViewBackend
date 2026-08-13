import { Request, Response } from 'express';
import { FeeAutomationSettings, FeeAutomationLog } from '../../model/erpModels/feeAutomation';

export const getSettings = async (req: Request, res: Response): Promise<void> => {
    try {
        let settings = await FeeAutomationSettings.findById('singleton');
        if (!settings) {
            settings = new FeeAutomationSettings();
            await settings.save();
        }
        res.status(200).json({ success: true, settings });
    } catch (error) {
        console.error('Get automation settings error:', error);
        res.status(500).json({ success: false, message: 'Failed to get settings' });
    }
};

export const updateSettings = async (req: Request, res: Response): Promise<void> => {
    try {
        const { isEnabled, startDay, windowDays } = req.body;
        
        let settings = await FeeAutomationSettings.findById('singleton');
        if (!settings) {
            settings = new FeeAutomationSettings();
        }

        if (isEnabled !== undefined) settings.isEnabled = isEnabled;
        if (startDay !== undefined) settings.startDay = startDay;
        if (windowDays !== undefined) settings.windowDays = windowDays;

        await settings.save();
        res.status(200).json({ success: true, message: 'Settings updated', settings });
    } catch (error) {
        console.error('Update automation settings error:', error);
        res.status(500).json({ success: false, message: 'Failed to update settings' });
    }
};

export const getLogs = async (req: Request, res: Response): Promise<void> => {
    try {
        const { monthStr, limit = 50 } = req.query;
        const filter = monthStr ? { monthStr: monthStr as string } : {};

        const logs = await FeeAutomationLog.find(filter)
            .populate({
                path: 'studentSessionId',
                populate: ['userId', 'classId']
            })
            .sort({ createdAt: -1 })
            .limit(Number(limit));

        res.status(200).json({ success: true, logs });
    } catch (error) {
        console.error('Get automation logs error:', error);
        res.status(500).json({ success: false, message: 'Failed to get logs' });
    }
};

export const triggerAutomation = async (req: Request, res: Response): Promise<void> => {
    try {
        // Implementation to manually trigger fee generation for current month
        res.status(501).json({ success: false, message: 'Trigger pending implementation' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to trigger automation' });
    }
};

export const getStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        // Implementation to check if background job is running
        res.status(501).json({ success: false, message: 'Status pending implementation' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to get status' });
    }
};
