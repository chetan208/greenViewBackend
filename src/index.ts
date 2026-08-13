import dotenv from 'dotenv';

dotenv.config();

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';

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

const app = express();

// Enable CORS for frontend & client requests
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

app.use(express.json());

app.use('/api/admin', adminRoutes);
app.use('/api/study-material', studyMaterialRoutes);

app.get('/', (req, res) => {
    res.send('Hello, World!');
});

const PORT = 8000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
