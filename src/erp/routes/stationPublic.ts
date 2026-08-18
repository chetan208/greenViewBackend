import express from 'express';
import TransportFee from '../../model/erpModels/transportFee';
import TransportRoute from '../../model/erpModels/transportRoute';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const [routes, stations] = await Promise.all([
            TransportRoute.find({ isActive: { $ne: false } }).sort({ routeName: 1 }),
            TransportFee.find().populate('routeId').sort({ station: 1 })
        ]);
        res.status(200).json({ success: true, routes, stations });
    } catch (error) {
        console.error('Error fetching public transport data:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch public transport data' });
    }
});

export default router;
