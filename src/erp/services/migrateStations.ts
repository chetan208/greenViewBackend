import TransportRoute from '../../model/erpModels/transportRoute';
import TransportFee from '../../model/erpModels/transportFee';

export const migrateStations = async () => {
    try {
        const stations = await TransportFee.find({ routeId: { $exists: false } });
        if (stations.length === 0) {
            console.log('No stations to migrate');
            return;
        }

        console.log(`Found ${stations.length} stations to migrate`);

        let route1 = await TransportRoute.findOne({ routeName: 'Route 1' });
        if (!route1) {
            route1 = new TransportRoute({ routeName: 'Route 1', description: 'Default Route 1' });
            await route1.save();
        }

        let route2 = await TransportRoute.findOne({ routeName: 'Route 2' });
        if (!route2) {
            route2 = new TransportRoute({ routeName: 'Route 2', description: 'Default Route 2' });
            await route2.save();
        }

        let count = 0;
        for (const station of stations) {
            // Distribute stations evenly between the two routes
            station.routeId = (count % 2 === 0) ? route1._id : route2._id;
            await station.save();
            count++;
        }

        console.log(`Migrated ${count} stations successfully`);
    } catch (error) {
        console.error('Migration error:', error);
    }
};
