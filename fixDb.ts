import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

const fixDb = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI as string);
        console.log('Connected to MongoDB');
        
        await mongoose.connection.collection('transportroutes').updateMany(
            { isActive: { $exists: false } },
            { $set: { isActive: true } }
        );
        console.log('Fixed isActive fields on transport routes');
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
};

fixDb();
