import { Request, Response } from 'express';
import TransportFee from '../../model/erpModels/transportFee';

export const getStations = async (req: Request, res: Response): Promise<void> => {
    try {
        const stations = await TransportFee.find().sort({ station: 1 });
        res.status(200).json({ success: true, stations });
    } catch (error) {
        console.error('Get stations error:', error);
        res.status(500).json({ success: false, message: 'Failed to get stations' });
    }
};

export const createStation = async (req: Request, res: Response): Promise<void> => {
    try {
        const { station, amount } = req.body;
        
        if (!station) {
            res.status(400).json({ success: false, message: 'Station name is required' });
            return;
        }

        const existing = await TransportFee.findOne({ station });
        if (existing) {
            res.status(400).json({ success: false, message: 'Station already exists' });
            return;
        }

        const newStation = new TransportFee({ station, amount: amount || 0 });
        await newStation.save();

        res.status(201).json({ success: true, message: 'Station created', station: newStation });
    } catch (error) {
        console.error('Create station error:', error);
        res.status(500).json({ success: false, message: 'Failed to create station' });
    }
};

export const updateStation = async (req: Request, res: Response): Promise<void> => {
    try {
        const { amount } = req.body;
        const station = await TransportFee.findByIdAndUpdate(
            req.params.id,
            { amount },
            { returnDocument: 'after' }
        );

        if (!station) {
            res.status(404).json({ success: false, message: 'Station not found' });
            return;
        }

        res.status(200).json({ success: true, message: 'Station updated', station });
    } catch (error) {
        console.error('Update station error:', error);
        res.status(500).json({ success: false, message: 'Failed to update station' });
    }
};

export const deleteStation = async (req: Request, res: Response): Promise<void> => {
    try {
        await TransportFee.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: 'Station deleted' });
    } catch (error) {
        console.error('Delete station error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete station' });
    }
};
