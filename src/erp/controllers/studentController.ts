import { Request, Response } from 'express';
import mongoose from 'mongoose';
import User from '../../model/erpModels/user';
import Session from '../../model/erpModels/session';
import Class from '../../model/erpModels/class';
import StudentSession from '../../model/erpModels/studentSession';
import FeeStructure from '../../model/erpModels/feeStructure';
import { generateFeeStructuresForSession } from '../services/feeService';

export const createStudent = async (req: Request, res: Response): Promise<void> => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const data = req.body;
        
        let activeSession = await Session.findOne({ isActive: true }).session(session);
        if (!activeSession) {
            res.status(400).json({ success: false, message: 'No active session found' });
            return;
        }

        const classDoc = await Class.findById(data.classId).session(session);
        if (!classDoc) {
            res.status(400).json({ success: false, message: 'Class not found' });
            return;
        }

        // 1. Create or Find User
        let user = await User.findOne({ phone: data.fatherMobile }).session(session);
        if (!user) {
            user = new User({
                phone: data.fatherMobile,
                role: 'student',
                name: data.studentName,
                photoUrl: data.photoUrl,
                photoPublicId: data.photoPublicId,
                cloudName: data.cloudName,
                studentProfile: {
                    fatherName: data.fatherName,
                    fatherMobile: data.fatherMobile,
                    motherName: data.motherName,
                    motherMobile: data.motherMobile,
                    guardianName: data.guardianName,
                    guardianMobile: data.guardianMobile,
                    dob: data.dob,
                    sex: data.sex,
                    religion: data.religion,
                    socialCategory: data.socialCategory,
                    motherTongue: data.motherTongue,
                    aadhaarNumber: data.aadhaarNumber,
                    address: data.address,
                    village: data.village,
                    postOffice: data.postOffice,
                    tehsil: data.tehsil,
                    district: data.district,
                    state: data.state,
                    pinCode: data.pinCode,
                    prevSchoolName: data.prevSchoolName,
                    prevSchoolMedium: data.prevSchoolMedium,
                    stream: data.stream,
                    subjects: data.subjects,
                    previousExams: data.previousExams,
                    bankAccountNo: data.bankAccountNo,
                    bankName: data.bankName,
                    bankBranch: data.bankBranch,
                    ifscCode: data.ifscCode,
                    bplStatus: data.bplStatus,
                    fatherOccupation: data.fatherOccupation,
                    annualIncome: data.annualIncome,
                    panNumber: data.panNumber
                }
            });
            await user.save({ session });
        }

        // 2. Create StudentSession
        const classPrefix = classDoc.className.substring(0, 3).toUpperCase();
        const lastStudentSession = await StudentSession.findOne({ 
            sessionId: activeSession._id,
            cardNo: new RegExp(`^${classPrefix}-`)
        }).sort({ cardNo: -1 }).session(session);

        let nextCardNum = 1;
        if (lastStudentSession) {
            const parts = lastStudentSession.cardNo.split('-');
            if (parts.length > 1) {
                nextCardNum = parseInt(parts[1], 10) + 1;
            }
        }
        const cardNo = `${classPrefix}-${nextCardNum.toString().padStart(3, '0')}`;

        const studentSession = new StudentSession({
            userId: user._id,
            sessionId: activeSession._id,
            classId: classDoc._id,
            section: data.section,
            cardNo,
            dateOfAdmission: new Date(),
            station: data.station,
            discountTuition: data.discountTuition || 0,
            discountBus: data.discountBus || 0,
            discountAdmission: data.discountAdmission || 0,
            discountAnnual: data.discountAnnual || 0,
            discountExam: data.discountExam || 0,
            discountComputer: data.discountComputer || 0
        });
        await studentSession.save({ session });

        // 3. Generate FeeStructures
        const startMonthIndex = data.admissionMonthIndex || 0;
        await generateFeeStructuresForSession(studentSession, classDoc.className, startMonthIndex, 0);

        await session.commitTransaction();
        session.endSession();

        res.status(201).json({ success: true, message: 'Student created successfully', user, studentSession });
    } catch (error: any) {
        await session.abortTransaction();
        session.endSession();
        console.error('Create student error:', error);
        res.status(500).json({ success: false, message: 'Failed to create student', error: error.message });
    }
};

export const getStudents = async (req: Request, res: Response): Promise<void> => {
    try {
        const { search, classId, session: sessionId, limit = 50 } = req.query;

        let activeSessionId = sessionId;
        if (!activeSessionId) {
            const activeSession = await Session.findOne({ isActive: true });
            activeSessionId = activeSession?._id as any;
        }

        const filter: any = { sessionId: activeSessionId };
        if (classId) filter.classId = classId;

        const studentSessions = await StudentSession.find(filter)
            .populate({
                path: 'userId',
                match: search ? { name: { $regex: search, $options: 'i' } } : {},
                select: '-otp -otpExpiry'
            })
            .populate('classId', 'className')
            .limit(Number(limit))
            .exec();

        // Filter out those where userId is null (did not match search)
        const validSessions = studentSessions.filter(s => s.userId != null);

        res.status(200).json({ success: true, students: validSessions });
    } catch (error) {
        console.error('Get students error:', error);
        res.status(500).json({ success: false, message: 'Failed to get students' });
    }
};

export const getStudentById = async (req: Request, res: Response): Promise<void> => {
    try {
        const studentSession = await StudentSession.findById(req.params.id)
            .populate('userId', '-otp -otpExpiry')
            .populate('classId')
            .populate('sessionId');

        if (!studentSession) {
            res.status(404).json({ success: false, message: 'Student session not found' });
            return;
        }

        res.status(200).json({ success: true, studentSession });
    } catch (error) {
        console.error('Get student by id error:', error);
        res.status(500).json({ success: false, message: 'Failed to get student' });
    }
};

export const updateStudent = async (req: Request, res: Response): Promise<void> => {
    try {
        // Implement updating both User profile and StudentSession discounts
        // Sync pending fees if discounts change
        res.status(501).json({ success: false, message: 'Update student pending implementation' });
    } catch (error) {
        console.error('Update student error:', error);
        res.status(500).json({ success: false, message: 'Failed to update student' });
    }
};

export const deleteStudent = async (req: Request, res: Response): Promise<void> => {
    try {
        // Implement deleting StudentSession and cascading FeeStructures/Payments
        res.status(501).json({ success: false, message: 'Delete student pending implementation' });
    } catch (error) {
        console.error('Delete student error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete student' });
    }
};

export const promoteStudent = async (req: Request, res: Response): Promise<void> => {
    try {
        // Implement promotion logic: lookup next class, calculate dues, create new session
        res.status(501).json({ success: false, message: 'Promote student pending implementation' });
    } catch (error) {
        console.error('Promote student error:', error);
        res.status(500).json({ success: false, message: 'Failed to promote student' });
    }
};

export const getNextRollNo = async (req: Request, res: Response): Promise<void> => {
    try {
        const { classId } = req.query;
        if (!classId) {
            res.status(400).json({ success: false, message: 'classId is required' });
            return;
        }

        const classDoc = await Class.findById(classId);
        if (!classDoc) {
            res.status(404).json({ success: false, message: 'Class not found' });
            return;
        }

        const activeSession = await Session.findOne({ isActive: true });
        if (!activeSession) {
            res.status(400).json({ success: false, message: 'No active session found' });
            return;
        }

        const classPrefix = classDoc.className.substring(0, 3).toUpperCase();
        const lastStudentSession = await StudentSession.findOne({ 
            sessionId: activeSession._id,
            cardNo: new RegExp(`^${classPrefix}-`)
        }).sort({ cardNo: -1 });

        let nextCardNum = 1;
        if (lastStudentSession) {
            const parts = lastStudentSession.cardNo.split('-');
            if (parts.length > 1) {
                nextCardNum = parseInt(parts[1], 10) + 1;
            }
        }
        
        const cardNo = `${classPrefix}-${nextCardNum.toString().padStart(3, '0')}`;
        res.status(200).json({ success: true, cardNo });
    } catch (error) {
        console.error('Get next roll no error:', error);
        res.status(500).json({ success: false, message: 'Failed to generate roll no' });
    }
};
