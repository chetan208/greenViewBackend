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
import { initWhatsApp } from './erp/services/whatsappService';
import { initFeeAutomationCron } from './erp/services/feeAutomationCron';
import { ensureCurrentSession, initSessionCron } from './erp/services/sessionManager';

const app = express();

// Enable CORS for frontend & client requests
const allowedOrigins = [
    'https://greenviewschool.in',
    'https://www.greenviewschool.in',
    'https://erp.greenviewschool.in',
    'http://localhost:3000'
];

if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (process.env.NODE_ENV !== 'production') {
            return callback(null, true); // Allow all in dev
        }

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.error(`CORS Blocked: Origin ${origin} not allowed.`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

// Security HTTP headers
app.use(helmet());

// Trust proxy is required when hosted on Render/Vercel so rate limiter sees client IP, not load balancer IP
app.set('trust proxy', 1);

// Global Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // Limit each IP to 500 requests per windowMs
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

app.use(express.json());
app.use(cookieParser());

app.use('/api/admin', adminRoutes);
app.use('/api/study-material', studyMaterialRoutes);
import heroImagesRoutes from './routes/heroImages';
app.use('/api/hero-images', heroImagesRoutes);
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

app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    
    // Auto-create academic session if it doesn't exist
    await ensureCurrentSession();

    // Initialize WhatsApp and Cron Automation
    initWhatsApp();
    initFeeAutomationCron();
    initSessionCron();
});
