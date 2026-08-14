import express from 'express';
import TransportFee from '../../model/erpModels/transportFee';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const stations = await TransportFee.find().sort({ station: 1 });
        res.status(200).json({ success: true, stations });
    } catch (error) {
        console.error('Error fetching stations:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch stations' });
    }
});

export default router;
