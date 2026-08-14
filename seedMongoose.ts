import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/model/erpModels/user.js';
import Session from './src/model/erpModels/session.js';
import Class from './src/model/erpModels/class.js';
import StudentSession from './src/model/erpModels/studentSession.js';

dotenv.config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI as string);
        console.log('MongoDB connected');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

const runSeeder = async () => {
    await connectDB();

    let activeSession = await Session.findOne({ isActive: true });
    if (!activeSession) {
        console.log("No active session found. Creating one...");
        activeSession = new Session({ year: "2026-27", isActive: true });
        await activeSession.save();
    }

    let classes = await Class.find();
    if (classes.length === 0) {
        console.log("No classes found. Creating some classes...");
        const class1 = new Class({ className: "Class 10", sections: ["A", "B", "C"] });
        const class2 = new Class({ className: "Class 9", sections: ["A", "B"] });
        await class1.save();
        await class2.save();
        classes = [class1, class2];
    }

    console.log("Seeding 5 Teachers...");
    for (let i = 1; i <= 5; i++) {
        const phone = `98000000${i.toString().padStart(2, '0')}`;
        const existing = await User.findOne({ phone });
        if (!existing) {
            const user = new User({
                phone,
                role: 'teacher',
                name: `Dummy Teacher ${i}`,
                email: `teacher${i}@greenview.edu.in`,
                teacherProfile: {
                    subject: i % 2 === 0 ? "Mathematics" : "Science",
                    qualification: "M.Sc, B.Ed",
                    department: "Academics",
                    employeeId: `TCH-${i.toString().padStart(3, '0')}`,
                    accessRole: "Teacher",
                    joinDate: new Date()
                }
            });
            await user.save();
            console.log(`Teacher ${i} created`);
        }
    }

    console.log("Seeding 10 Students...");
    for (let i = 1; i <= 10; i++) {
        const phone = `99000000${i.toString().padStart(2, '0')}`;
        let user = await User.findOne({ phone });
        
        if (!user) {
            user = new User({
                phone,
                role: 'student',
                name: `Dummy Student ${i}`,
                studentProfile: {
                    fatherName: `Father of Student ${i}`,
                    fatherMobile: phone,
                    motherName: `Mother of Student ${i}`,
                    dob: "2010-05-15",
                    sex: i % 2 === 0 ? "Male" : "Female",
                    religion: "Hindu",
                    socialCategory: "General",
                    address: `House ${i}, Green View Street`
                }
            });
            await user.save();

            const randomClass = classes[Math.floor(Math.random() * classes.length)];
            const sections = randomClass.sections && randomClass.sections.length > 0 ? randomClass.sections : ['A'];
            const randomSection = sections[Math.floor(Math.random() * sections.length)];

            const studentSession = new StudentSession({
                userId: user._id,
                sessionId: activeSession._id,
                classId: randomClass._id,
                section: randomSection,
                cardNo: `${randomClass.className.substring(0, 3).toUpperCase()}-0${i.toString().padStart(2, '0')}`,
                dateOfAdmission: new Date()
            });
            await studentSession.save();
            console.log(`Student ${i} created`);
        }
    }

    console.log("Seeding completed!");
    process.exit(0);
};

runSeeder().catch(console.error);
