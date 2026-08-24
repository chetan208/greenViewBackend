import { Request, Response } from 'express';
import TransportFee from '../../model/erpModels/transportFee';
import StudentSession from '../../model/erpModels/studentSession';

export const getStations = async (req: Request, res: Response): Promise<void> => {
    try {
        const stations = await TransportFee.find().populate('routeId').sort({ order: 1, station: 1 });
        res.status(200).json({ success: true, stations });
    } catch (error) {
        console.error('Get stations error:', error);
        res.status(500).json({ success: false, message: 'Failed to get stations' });
    }
};

export const createStation = async (req: Request, res: Response): Promise<void> => {
    try {
        const { station, amount, routeId } = req.body;
        
        if (!station) {
            res.status(400).json({ success: false, message: 'Station name is required' });
            return;
        }
        if (!routeId) {
            res.status(400).json({ success: false, message: 'Route is required' });
            return;
        }

        const existing = await TransportFee.findOne({ station, routeId });
        if (existing) {
            res.status(400).json({ success: false, message: 'Station already exists in this route' });
            return;
        }

        // Default order to be the last
        const count = await TransportFee.countDocuments({ routeId });

        const newStation = new TransportFee({ station, amount: amount || 0, routeId, order: count });
        await newStation.save();

        res.status(201).json({ success: true, message: 'Station created', station: newStation });
    } catch (error) {
        console.error('Create station error:', error);
        res.status(500).json({ success: false, message: 'Failed to create station' });
    }
};

export const updateStation = async (req: Request, res: Response): Promise<void> => {
    try {
        const { station, amount, routeId } = req.body;
        const updatedStation = await TransportFee.findByIdAndUpdate(
            req.params.id,
            { station, amount, routeId },
            { returnDocument: 'after' }
        ).populate('routeId');

        if (!updatedStation) {
            res.status(404).json({ success: false, message: 'Station not found' });
            return;
        }

        res.status(200).json({ success: true, message: 'Station updated', station: updatedStation });
    } catch (error) {
        console.error('Update station error:', error);
        res.status(500).json({ success: false, message: 'Failed to update station' });
    }
};

export const deleteStation = async (req: Request, res: Response): Promise<void> => {
    try {
        const activeStudents = await StudentSession.countDocuments({ transportStationId: req.params.id });
        if (activeStudents > 0) {
            res.status(400).json({ 
                success: false, 
                message: `Cannot delete station. ${activeStudents} student(s) are currently assigned to this station.` 
            });
            return;
        }

        await TransportFee.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: 'Station deleted' });
    } catch (error) {
        console.error('Delete station error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete station' });
    }
};

export const reorderStations = async (req: Request, res: Response): Promise<void> => {
    try {
        const { orderedIds } = req.body; // array of station IDs
        if (!Array.isArray(orderedIds)) {
            res.status(400).json({ success: false, message: 'Invalid data format' });
            return;
        }

        const bulkOps = orderedIds.map((id, index) => ({
            updateOne: {
                filter: { _id: id },
                update: { order: index }
            }
        }));

        if (bulkOps.length > 0) {
            await TransportFee.bulkWrite(bulkOps);
        }

        res.status(200).json({ success: true, message: 'Stations reordered successfully' });
    } catch (error) {
        console.error('Reorder stations error:', error);
        res.status(500).json({ success: false, message: 'Failed to reorder stations' });
    }
};
