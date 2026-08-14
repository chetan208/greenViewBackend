import dotenv from 'dotenv';

dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

async function connectToDatabase() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI as string);
        console.log('Connected to MongoDB');
    } catch (error) {
        console.log('Error connecting to MongoDB:', error);
    }
}

connectToDatabase();

import adminRoutes from '@/admin/routes/index';
import studyMaterialRoutes from '@/routes/studyMaterial';
import authRoutes from './erp/routes/authRoutes';
import admissionRoutes from './erp/routes/admissionRoutes';
import erpRoutes from './erp/routes/index';
import feeRoutes from './erp/routes/feeRoutes';
import stationPublicRoutes from './erp/routes/stationPublic';
import whatsappRoutes from './erp/routes/whatsappRoutes';
import { seedClasses } from './erp/services/seedClasses';
import { seedStations } from './erp/services/seedStations';
import { initWhatsApp } from './erp/services/whatsappService';
import { initFeeAutomationCron } from './erp/services/feeAutomationCron';

const app = express();

// Security HTTP headers
app.use(helmet());

// Global Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// OTP specific rate limiting
const otpLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Limit each IP to 5 OTP requests per hour
    message: 'Too many OTP requests from this IP, please try again after an hour.'
});
app.use('/api/auth/send-otp', otpLimiter);

// Enable CORS for frontend & client requests
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://greenviewschool.com', 'https://erp.greenviewschool.com', process.env.FRONTEND_URL || ''] 
        : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

app.use(express.json());
app.use(cookieParser());

app.use('/api/admin', adminRoutes);
app.use('/api/study-material', studyMaterialRoutes);
import topResultRoutes from './routes/topResult';
app.use('/api/top-results', topResultRoutes);

app.use('/api/auth', authRoutes);
app.use('/api/admissions', admissionRoutes);
app.use('/api/erp', erpRoutes);
app.use('/api/erp/whatsapp', whatsappRoutes);
app.use('/api/fees', feeRoutes);
import paymentRoutes from './erp/routes/paymentRoutes';
app.use('/api/payments', paymentRoutes);
app.use('/api/stations', stationPublicRoutes);

app.get('/', (req, res) => {
    res.send('Green View ERP API is running!');
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('Unhandled Error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
    });
});

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    seedClasses();
    seedStations();
    
    // Initialize WhatsApp and Cron Automation
    initWhatsApp();
    initFeeAutomationCron();
});
