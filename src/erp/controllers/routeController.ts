import { Request, Response } from 'express';
import TransportRoute from '../../model/erpModels/transportRoute';
import TransportFee from '../../model/erpModels/transportFee';
import StudentSession from '../../model/erpModels/studentSession';

export const getRoutes = async (req: Request, res: Response): Promise<void> => {
    try {
        const routes = await TransportRoute.find().sort({ routeName: 1 });
        res.status(200).json({ success: true, routes });
    } catch (error) {
        console.error('Get routes error:', error);
        res.status(500).json({ success: false, message: 'Failed to get routes' });
    }
};

export const createRoute = async (req: Request, res: Response): Promise<void> => {
    try {
        const { routeName, description } = req.body;
        
        if (!routeName) {
            res.status(400).json({ success: false, message: 'Route name is required' });
            return;
        }

        const existing = await TransportRoute.findOne({ routeName });
        if (existing) {
            res.status(400).json({ success: false, message: 'Route already exists' });
            return;
        }

        const newRoute = new TransportRoute({ routeName, description });
        await newRoute.save();

        res.status(201).json({ success: true, message: 'Route created', route: newRoute });
    } catch (error) {
        console.error('Create route error:', error);
        res.status(500).json({ success: false, message: 'Failed to create route' });
    }
};

export const updateRoute = async (req: Request, res: Response): Promise<void> => {
    try {
        const { routeName, description, isActive } = req.body;
        const route = await TransportRoute.findByIdAndUpdate(
            req.params.id,
            { routeName, description, isActive },
            { returnDocument: 'after' }
        );

        if (!route) {
            res.status(404).json({ success: false, message: 'Route not found' });
            return;
        }

        res.status(200).json({ success: true, message: 'Route updated', route });
    } catch (error) {
        console.error('Update route error:', error);
        res.status(500).json({ success: false, message: 'Failed to update route' });
    }
};

export const deleteRoute = async (req: Request, res: Response): Promise<void> => {
    try {
        // Check if any stations exist in this route
        const stations = await TransportFee.find({ routeId: req.params.id });
        
        if (stations.length > 0) {
            // Check if any students are assigned to these stations
            const stationIds = stations.map(s => s._id);
            const activeStudents = await StudentSession.countDocuments({ transportStationId: { $in: stationIds } });
            
            if (activeStudents > 0) {
                res.status(400).json({ 
                    success: false, 
                    message: `Cannot delete route. ${activeStudents} student(s) are currently assigned to stations in this route.` 
                });
                return;
            }
            
            // Delete all stations in this route
            await TransportFee.deleteMany({ routeId: req.params.id });
        }

        await TransportRoute.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: 'Route and its stations deleted' });
    } catch (error) {
        console.error('Delete route error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete route' });
    }
};
