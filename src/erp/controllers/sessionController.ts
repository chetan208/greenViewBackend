import { Request, Response } from 'express';
import Session from '../../model/erpModels/session';

export const getSessions = async (req: Request, res: Response): Promise<void> => {
    try {
        const sessions = await Session.find().sort({ year: -1 });
        res.status(200).json({ success: true, sessions });
    } catch (error) {
        console.error('Get sessions error:', error);
        res.status(500).json({ success: false, message: 'Failed to get sessions' });
    }
};

export const createSession = async (req: Request, res: Response): Promise<void> => {
    try {
        const { year, isActive } = req.body;

        if (!year) {
            res.status(400).json({ success: false, message: 'Year is required' });
            return;
        }

        const existing = await Session.findOne({ year });
        if (existing) {
            res.status(400).json({ success: false, message: 'Session already exists' });
            return;
        }

        if (isActive) {
            // Deactivate all others
            await Session.updateMany({}, { isActive: false });
        }

        const session = new Session({ year, isActive: isActive || false });
        await session.save();

        res.status(201).json({ success: true, message: 'Session created successfully', session });
    } catch (error) {
        console.error('Create session error:', error);
        res.status(500).json({ success: false, message: 'Failed to create session' });
    }
};

export const updateSession = async (req: Request, res: Response): Promise<void> => {
    try {
        const { isActive } = req.body;
        
        if (isActive) {
            await Session.updateMany({}, { isActive: false });
        }

        const session = await Session.findByIdAndUpdate(
            req.params.id,
            { isActive },
            { returnDocument: 'after' }
        );

        res.status(200).json({ success: true, message: 'Session updated successfully', session });
    } catch (error) {
        console.error('Update session error:', error);
        res.status(500).json({ success: false, message: 'Failed to update session' });
    }
};

export const getAdmissionStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const activeSession = await Session.findOne({ isActive: true });
        res.status(200).json({ success: true, open: activeSession?.admissionsOpen || false });
    } catch (error) {
        console.error('Get admission status error:', error);
        res.status(500).json({ success: false, message: 'Failed to get admission status', open: false });
    }
};

export const toggleAdmissionStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { admissionsOpen } = req.body;
        const session = await Session.findByIdAndUpdate(
            req.params.id,
            { admissionsOpen },
            { returnDocument: 'after' }
        );
        res.status(200).json({ success: true, message: 'Admission status updated successfully', session });
    } catch (error) {
        console.error('Toggle admission status error:', error);
        res.status(500).json({ success: false, message: 'Failed to toggle admission status' });
    }
};
