import TransportFee from '../../model/erpModels/transportFee';

export const seedStations = async () => {
    try {
        const count = await TransportFee.countDocuments();
        const defaultStations = [
            // Route 01
            { station: "Gopal Nagar", amount: 1200, routeNumber: "Bus Route 01", routeCode: "PB-08-AB-1234", pickupTime: "07:15 AM" },
            { station: "Shiv Mandir", amount: 1100, routeNumber: "Bus Route 01", routeCode: "PB-08-AB-1234", pickupTime: "07:25 AM" },
            { station: "Main Highway Chowk", amount: 1000, routeNumber: "Bus Route 01", routeCode: "PB-08-AB-1234", pickupTime: "07:35 AM" },
            { station: "Sector-4 Market", amount: 800, routeNumber: "Bus Route 01", routeCode: "PB-08-AB-1234", pickupTime: "07:45 AM" },
            
            // Route 02
            { station: "Railway Road", amount: 1500, routeNumber: "Bus Route 02", routeCode: "PB-08-AB-5678", pickupTime: "07:20 AM" },
            { station: "Green Valley Residency", amount: 1300, routeNumber: "Bus Route 02", routeCode: "PB-08-AB-5678", pickupTime: "07:30 AM" },
            { station: "New Colony Phase-I", amount: 1000, routeNumber: "Bus Route 02", routeCode: "PB-08-AB-5678", pickupTime: "07:40 AM" },
            { station: "Sector-12 Chowk", amount: 800, routeNumber: "Bus Route 02", routeCode: "PB-08-AB-5678", pickupTime: "07:50 AM" },
            
            // Route 03
            { station: "City Center Mall", amount: 1800, routeNumber: "Bus Route 03", routeCode: "PB-08-AB-9012", pickupTime: "07:10 AM" },
            { station: "Diamond Enclave", amount: 1500, routeNumber: "Bus Route 03", routeCode: "PB-08-AB-9012", pickupTime: "07:25 AM" },
            { station: "Central Park", amount: 1200, routeNumber: "Bus Route 03", routeCode: "PB-08-AB-9012", pickupTime: "07:40 AM" },
            
            // Shared Destination
            { station: "School Campus", amount: 0, routeNumber: "Bus Route 01", routeCode: "PB-08-AB-1234", pickupTime: "08:00 AM" }
        ];

        for (const st of defaultStations) {
            await TransportFee.findOneAndUpdate(
                { station: st.station },
                { $set: st },
                { upsert: true, returnDocument: 'after' }
            );
        }
        console.log('Seeded/Updated default stations successfully');
    } catch (error) {
        console.error('Error seeding stations:', error);
    }
};
