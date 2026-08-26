import { Request, Response } from 'express';
import mongoose from 'mongoose';
import User from '../../model/erpModels/user';
import Session from '../../model/erpModels/session';
import Class from '../../model/erpModels/class';
import StudentSession from '../../model/erpModels/studentSession';
import FeeStructure from '../../model/erpModels/feeStructure';
import { generateFeeStructuresForSession, syncPendingFeesAfterDiscountUpdate } from '../services/feeService';

import { sendWhatsAppMessage } from '../services/whatsappService';

export const createStudent = async (req: Request, res: Response): Promise<void> => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const data = req.body;
        
        let targetSessionYear = data.sessionYear;
        let activeSession;

        if (targetSessionYear) {
            activeSession = await Session.findOne({ year: targetSessionYear }).session(session);
            if (!activeSession) {
                activeSession = new Session({
                    year: targetSessionYear,
                    isActive: true,
                    admissionsOpen: false
                });
                await activeSession.save({ session });
                // Make it the only active session
                await Session.updateMany({ _id: { $ne: activeSession._id } }, { isActive: false }).session(session);
            }
        } else {
            activeSession = await Session.findOne({ isActive: true }).session(session);
        }

        if (!activeSession) {
            res.status(400).json({ success: false, message: 'No session found and none provided' });
            return;
        }

        let classDoc;
        if (data.classId) {
            classDoc = await Class.findById(data.classId).session(session);
        } else if (data.className) {
            classDoc = await Class.findOne({ className: data.className }).session(session);
        }

        if (!classDoc) {
            res.status(400).json({ success: false, message: 'Class not found' });
            return;
        }

        // 1. Create or Find User
        const phone = data.contactNo || data.fatherMobile;
        let user = await User.findOne({ phone: phone }).session(session);
        
        let photoUrl = data.photoUrl;
        let photoPublicId = data.photoPublicId;
        
        if (req.file) {
            photoUrl = req.file.path;
            photoPublicId = req.file.filename;
        }

        if (!user) {
            user = new User({
                phone: phone,
                role: 'student',
                name: data.name || data.studentName,
                photoUrl: photoUrl,
                photoPublicId: photoPublicId,
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
            dateOfAdmission: data.admissionDate ? new Date(data.admissionDate) : (data.dateOfAdmission ? new Date(data.dateOfAdmission) : new Date()),
            station: data.station,
            discountTuition: data.discountTuition || 0,
            discountBus: data.discountBus || 0,
            discountAdmission: data.discountAdmission || 0,
            discountAnnual: data.discountAnnual || 0,
            discountExam: data.discountExam || 0,
            discountComputer: data.discountComputer || 0,
            previousSessionDues: data.previousSessionDues || 0
        });
        await studentSession.save({ session });

        // 3. Generate FeeStructures starting from admission month
        const startMonthIndex = (data.admissionMonthIndex !== undefined && data.admissionMonthIndex !== null)
            ? Number(data.admissionMonthIndex)
            : undefined;
        await generateFeeStructuresForSession(studentSession, classDoc.className, startMonthIndex, data.previousSessionDues || 0);

        await session.commitTransaction();
        session.endSession();

        // Send WhatsApp Admission Notification
        const message = `Dear ${data.fatherName || 'Parent'},\n\nYour child ${data.studentName} has been successfully admitted to Green View School in ${classDoc.className}.\n\nThank you for choosing Green View School!`;
        sendWhatsAppMessage(data.fatherMobile, message).catch(err => {
            console.error("Failed to send admission WhatsApp message:", err);
        });

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
        const searchStr = req.query.search ? String(req.query.search) : '';
        const classIdStr = req.query.classId ? String(req.query.classId) : '';
        const sessionStr = req.query.session ? String(req.query.session) : '';
        const limit = Math.max(1, parseInt(String(req.query.limit || 50)) || 50);

        let activeSessionId: string | null = sessionStr || null;

        if (sessionStr && !mongoose.Types.ObjectId.isValid(sessionStr)) {
            const sessionDoc = await Session.findOne({ year: sessionStr });
            if (sessionDoc) activeSessionId = (sessionDoc._id as any).toString();
            else activeSessionId = null;
        }

        if (!activeSessionId) {
            const activeSession = await Session.findOne({ isActive: true });
            activeSessionId = activeSession ? (activeSession._id as any).toString() : null;
        }

        const filter: any = { sessionId: activeSessionId };
        if (classIdStr) filter.classId = classIdStr;

        const studentSessions = await StudentSession.find(filter)
            .populate({
                path: 'userId',
                match: searchStr ? { name: { $regex: searchStr, $options: 'i' } } : {},
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
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        const studentSession = await StudentSession.findById(req.params.id)
            .populate('classId')
            .session(session);

        if (!studentSession) {
            res.status(404).json({ success: false, message: 'Student session not found' });
            return;
        }

        const user = await User.findById(studentSession.userId).session(session);
        if (!user) {
            res.status(404).json({ success: false, message: 'Student user profile not found' });
            return;
        }

        const data = req.body;

        // 1. Update User Profile
        if (data.name !== undefined) user.name = data.name;
        if (data.contactNo !== undefined) {
            const currentBasePhone = (user.phone || '').split('_')[0];
            if (data.contactNo !== currentBasePhone) {
                user.phone = data.contactNo;
            }
        }
        
        if (req.file) {
            user.photoUrl = req.file.path;
            user.photoPublicId = req.file.filename;
        }
        
        const profileFields = [
            'fatherName', 'motherName', 'dob', 'sex', 'religion', 'socialCategory', 
            'motherTongue', 'address', 'prevSchoolName', 'aadhaarNumber',
            'fatherMobile', 'motherMobile', 'guardianName', 'guardianMobile',
            'village', 'postOffice', 'tehsil', 'district', 'state', 'pinCode'
        ];

        if (!user.studentProfile) user.studentProfile = {} as any;

        profileFields.forEach(field => {
            if (data[field] !== undefined) {
                (user.studentProfile as any)[field] = data[field];
            }
        });

        await user.save({ session });

        // 2. Update StudentSession
        let discountsChanged = false;
        const sessionFields = [
            'section', 'cardNo', 'station',
            'discountTuition', 'discountBus', 'discountAdmission',
            'discountAnnual', 'discountExam', 'discountComputer'
        ];

        sessionFields.forEach(field => {
            if (data[field] !== undefined) {
                if (field.startsWith('discount') && (studentSession as any)[field] !== Number(data[field])) {
                    discountsChanged = true;
                }
                if (field.startsWith('discount')) {
                    (studentSession as any)[field] = Number(data[field]) || 0;
                } else {
                    (studentSession as any)[field] = data[field];
                }
            }
        });

        // if classId is updated
        if (data.classId && data.classId !== (studentSession.classId as any)._id.toString()) {
            studentSession.classId = new mongoose.Types.ObjectId(data.classId);
            discountsChanged = true; // changing class also recalculates fees
        }
        
        // if station is updated
        if (data.station !== undefined && data.station !== studentSession.station) {
            discountsChanged = true;
        }

        await studentSession.save({ session });

        // 3. Sync Pending Fees if needed
        if (discountsChanged) {
            // Need to populate classId to get the className for calculateMonthlyFee
            await studentSession.populate('classId');
            const className = (studentSession.classId as any).className;
            await syncPendingFeesAfterDiscountUpdate(studentSession, className);
        }

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ success: true, message: 'Student profile updated successfully' });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
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
