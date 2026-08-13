import Class from '../../model/erpModels/class';

export const seedClasses = async () => {
    const DEFAULT_CLASSES = [
        "Nursery", "LKG", "UKG",
        "Class I", "Class II", "Class III", "Class IV", "Class V",
        "Class VI", "Class VII", "Class VIII", "Class IX", "Class X",
        "Class XI", "Class XII"
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
