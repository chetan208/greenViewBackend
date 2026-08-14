import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { createStudent } from './src/erp/controllers/studentController';
import { createTeacher } from './src/erp/controllers/teacherController';
import Session from './src/model/erpModels/session';
import Class from './src/model/erpModels/class';
import { Request, Response } from 'express';

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

    const activeSession = await Session.findOne({ isActive: true });
    if (!activeSession) {
        console.log("No active session found. Please create one first.");
        process.exit(1);
    }

    const classes = await Class.find();
    if (classes.length === 0) {
        console.log("No classes found. Please create one first.");
        process.exit(1);
    }

    // Mock response object
    const mockRes = {
        status: (code: number) => ({
            json: (data: any) => { 
                if (code >= 400) console.error(`Error ${code}:`, data);
                else console.log(`Success ${code}:`, data.message);
            }
        })
    } as unknown as Response;

    console.log("Seeding 5 Teachers...");
    for (let i = 1; i <= 5; i++) {
        const mockReq = {
            body: {
                phone: `98000000${i.toString().padStart(2, '0')}`,
                name: `Dummy Teacher ${i}`,
                email: `teacher${i}@greenview.edu.in`,
                subject: i % 2 === 0 ? "Mathematics" : "Science",
                qualification: "M.Sc, B.Ed",
                department: "Academics",
                employeeId: `TCH-${i.toString().padStart(3, '0')}`,
                accessRole: "Teacher"
            }
        } as Request;

        await createTeacher(mockReq, mockRes);
    }

    console.log("Seeding 10 Students...");
    for (let i = 1; i <= 10; i++) {
        const randomClass = classes[Math.floor(Math.random() * classes.length)];
        const sections = randomClass.sections && randomClass.sections.length > 0 ? randomClass.sections : ['A'];
        const randomSection = sections[Math.floor(Math.random() * sections.length)];

        const mockReq = {
            body: {
                studentName: `Dummy Student ${i}`,
                classId: randomClass._id,
                section: randomSection,
                fatherName: `Father of Student ${i}`,
                fatherMobile: `99000000${i.toString().padStart(2, '0')}`,
                motherName: `Mother of Student ${i}`,
                dob: "2010-05-15",
                sex: i % 2 === 0 ? "Male" : "Female",
                religion: "Hindu",
                socialCategory: "General",
                address: `House ${i}, Green View Street`,
                admissionMonthIndex: 0
            }
        } as Request;

        await createStudent(mockReq, mockRes);
    }

    console.log("Seeding completed!");
    process.exit(0);
};

runSeeder();
