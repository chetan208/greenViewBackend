import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

const testDb = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI as string);
        console.log('Connected to MongoDB');
        
        // Use any to avoid schema issues, we just want to query the collection directly
        const routes = await mongoose.connection.collection('transportroutes').find().toArray();
        console.log('Routes in DB:', routes);
        
        if (routes.length === 0) {
            console.log('Inserting default routes...');
            await mongoose.connection.collection('transportroutes').insertMany([
                { routeName: 'Route 1', description: 'Default Route 1', isActive: true, createdAt: new Date(), updatedAt: new Date() },
                { routeName: 'Route 2', description: 'Default Route 2', isActive: true, createdAt: new Date(), updatedAt: new Date() }
            ]);
            console.log('Inserted.');
            
            const newRoutes = await mongoose.connection.collection('transportroutes').find().toArray();
            
            const route1Id = newRoutes.find(r => r.routeName === 'Route 1')._id;
            const route2Id = newRoutes.find(r => r.routeName === 'Route 2')._id;
            
            console.log('Updating stations...');
            const stations = await mongoose.connection.collection('transportfees').find().toArray();
            let count = 0;
            for (const station of stations) {
                const routeId = (count % 2 === 0) ? route1Id : route2Id;
                await mongoose.connection.collection('transportfees').updateOne(
                    { _id: station._id },
                    { $set: { routeId: routeId } }
                );
                count++;
            }
            console.log(`Updated ${count} stations.`);
        }
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
};

testDb();
