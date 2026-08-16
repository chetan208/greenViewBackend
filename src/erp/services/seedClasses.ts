import Class from '../../model/erpModels/class';

export const seedClasses = async () => {
    const DEFAULT_CLASSES = [
        "Nursery", "LKG", "UKG",
        "Class 1", "Class 2", "Class 3", "Class 4", "Class 5",
        "Class 6", "Class 7", "Class 8", "Class 9", "Class 10",
        "Class 11", "Class 12"
    ];

    try {
        for (const className of DEFAULT_CLASSES) {
            await Class.updateOne(
                { className },
                { $setOnInsert: { className } },
                { upsert: true }
            );
        }
        console.log('[Seed] Classes seeded successfully.');
    } catch (error) {
        console.error('[Seed] Error seeding classes:', error);
    }
};
