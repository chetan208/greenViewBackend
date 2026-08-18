
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/greenview')
    .then(async () => {
        console.log('Connected to MongoDB');
        
        // Define minimal schema just for updating
        const userSchema = new mongoose.Schema({ phone: String, role: String, accessLevel: String, staffProfile: Object }, { strict: false });
        const User = mongoose.model('User', userSchema, 'users');
        
        const phone = '7018152657';
        const user = await User.findOne({ phone });
        
        if (!user) {
            console.log('User not found with phone:', phone);
            process.exit(1);
        }
        
        user.role = 'user';
        user.accessLevel = 'superadmin';
        if (!user.staffProfile) {
            user.staffProfile = {};
        }
        user.staffProfile.post = 'Super Admin';
        
        await user.save();
        console.log('Successfully updated user to superadmin:', phone);
        process.exit(0);
    })
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });

