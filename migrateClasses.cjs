const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/greenview-erp').then(async () => {
    const Class = require('./src/model/erpModels/class').default;
    
    const mappings = {
        'Class I': 'Class 1',
        'Class II': 'Class 2',
        'Class III': 'Class 3',
        'Class IV': 'Class 4',
        'Class V': 'Class 5',
        'Class VI': 'Class 6',
        'Class VII': 'Class 7',
        'Class VIII': 'Class 8',
        'Class IX': 'Class 9',
        'Class X': 'Class 10',
        'Class XI': 'Class 11',
        'Class XII': 'Class 12'
    };

    for (const [oldName, newName] of Object.entries(mappings)) {
        await Class.updateMany({ className: oldName }, { $set: { className: newName } });
    }
    
    console.log('Migrated classes to numeric names.');
    process.exit(0);
});
