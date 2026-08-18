import express from 'express';
import studentRoutes from './studentRoutes';
import teacherRoutes from './teacherRoutes';
import classRoutes from './classRoutes';
import sessionRoutes from './sessionRoutes';
import stationRoutes from './stationRoutes';
import routeRoutes from './routeRoutes';
import feeAutomationRoutes from './feeAutomationRoutes';

const router = express.Router();

router.use('/students', studentRoutes);
router.use('/teachers', teacherRoutes);
router.use('/classes', classRoutes);
router.use('/sessions', sessionRoutes);
router.use('/stations', stationRoutes);
router.use('/routes', routeRoutes);
router.use('/fee-automation', feeAutomationRoutes);

export default router;
