import { Request, Response } from 'express';
import mongoose from 'mongoose';
import AdmissionApplication from '../../model/erpModels/admissionApplication';
import User from '../../model/erpModels/user';
import Session from '../../model/erpModels/session';
import Class from '../../model/erpModels/class';
import StudentSession from '../../model/erpModels/studentSession';
import { generateFeeStructuresForSession } from '../services/feeService';
import { getNextCloudinaryInstance } from '../../../config/cloudinary';
import { sendWhatsAppMessage } from '../services/whatsappService';

// Generate application ID like PR-2026-001 or SR-2026-001
const generateAppId = async (type: 'primary' | 'senior', year: string): Promise<string> => {
    const prefix = type === 'primary' ? 'PR' : 'SR';
    const yearPrefix = year.split('-')[0];
    
    // Find last application of this type and year
    const lastApp = await AdmissionApplication.findOne({ 
        applicationId: new RegExp(`^${prefix}-${yearPrefix}-`) 
    }).sort({ applicationId: -1 });

    let nextNum = 1;
    if (lastApp) {
        const parts = lastApp.applicationId.split('-');
        nextNum = parseInt(parts[2], 10) + 1;
    }

    return `${prefix}-${yearPrefix}-${nextNum.toString().padStart(3, '0')}`;
};

import fs from 'fs';

export const submitApplication = async (req: Request, res: Response): Promise<void> => {
    let uploadedCloudName: string | null = null;
    let uploadedPublicId: string | null = null;
    let usedCloudinaryInstance: any = null;

    try {
        const data = req.body;
        
        // Parse JSON strings from FormData
        if (typeof data.selectedSubjects === 'string') {
            try { data.selectedSubjects = JSON.parse(data.selectedSubjects); } catch (e) {}
        }
        if (typeof data.previousExams === 'string') {
            try { 
                data.previousExams = JSON.parse(data.previousExams); 
                if (Array.isArray(data.previousExams)) {
                    data.previousExams = data.previousExams.map((exam: any) => {
                        if (typeof exam.percentage === 'string') {
                            exam.percentage = Number(exam.percentage.replace('%', '').trim());
                        }
                        if (typeof exam.maxMarks === 'string') exam.maxMarks = Number(exam.maxMarks);
                        if (typeof exam.marksObtained === 'string') exam.marksObtained = Number(exam.marksObtained);
                        return exam;
                    });
                }
            } catch (e) {}
        }
        
        // Auto-determine type based on class (simple logic: XI/XII = senior)
        const isSenior = ['Class 11', 'Class 12', 'Class XI', 'Class XII'].includes(data.appliedClass);
        data.applicationType = isSenior ? 'senior' : 'primary';
        
        // Use active session if not provided
        if (!data.sessionYear) {
            const activeSession = await Session.findOne({ isActive: true });
            if (!activeSession) {
                res.status(400).json({ success: false, message: 'No active session found' });
                return;
            }
            data.sessionYear = activeSession.year;
        }

        if (data.aadhaarNumber) {
            const existingApp = await AdmissionApplication.findOne({ aadhaarNumber: data.aadhaarNumber, sessionYear: data.sessionYear });
            if (existingApp) {
                res.status(400).json({ error: 'An application with this Aadhaar number has already been submitted for the current session.' });
                return;
            }
        }

        data.applicationId = await generateAppId(data.applicationType, data.sessionYear);
        
        if (req.file) {
            const { cloudinary, cloud_name } = getNextCloudinaryInstance();
            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: 'admissions'
            });

            uploadedCloudName = cloud_name;
            uploadedPublicId = result.public_id;
            usedCloudinaryInstance = cloudinary;

            data.photoUrl = result.secure_url;
            data.photoPublicId = result.public_id;
            data.cloudName = cloud_name;

            // Cleanup temp file
            fs.promises.unlink(req.file.path).catch(err => console.error('Failed to clean up temp file:', err));
        }

        const application = new AdmissionApplication(data);
        await application.save();

        // Send WhatsApp notification
        if (data.fatherMobile) {
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            const downloadLink = `${frontendUrl}/api/erp/admissions/${application._id}/pdf`;
            const message = `Hello ${data.studentName || 'Student'},\n\nYour admission application for ${data.appliedClass} has been submitted successfully.\n\nApplication ID: ${application.applicationId}\n\nPlease visit the school with the following original documents for verification:\n1. School Leaving Certificate\n2. Previous Class Result\n3. Character Certificate\n4. Aadhaar Card copy\n5. Category Certificate (if applicable)\n6. Bank Passbook copy\n\nYou can view and download your application form here:\n${downloadLink}\n\nRegards,\nGreen View Public School`;
            
            // Fire and forget
            sendWhatsAppMessage(data.fatherMobile, message).catch(err => console.error('Failed to send WA message on submit:', err));
        }

        res.status(201).json({ 
            success: true, 
            message: 'Application submitted successfully',
            applicationId: application.applicationId,
            _id: application._id
        });
    } catch (error: any) {
        console.error('Submit application error:', error);
        if (uploadedCloudName && uploadedPublicId && usedCloudinaryInstance) {
            try {
                await usedCloudinaryInstance.uploader.destroy(uploadedPublicId);
            } catch (cloudinaryError) {
                console.error('Error cleaning up uploaded document:', cloudinaryError);
            }
        }
        if (req.file) {
            fs.promises.unlink(req.file.path).catch(() => {});
        }
        res.status(500).json({ success: false, message: 'Failed to submit application', error: error.message });
    }
};

export const listApplications = async (req: Request, res: Response): Promise<void> => {
    try {
        const { status, type, session, appliedClass } = req.query;
        
        const filter: any = {};
        if (status) filter.status = status;
        if (type) filter.applicationType = type;
        if (session) filter.sessionYear = session;
        if (appliedClass) filter.appliedClass = appliedClass;

        const applications = await AdmissionApplication.find(filter).sort({ createdAt: -1 });
        res.status(200).json({ success: true, applications });
    } catch (error) {
        console.error('List applications error:', error);
        res.status(500).json({ success: false, message: 'Failed to list applications' });
    }
};

export const getApplication = async (req: Request, res: Response): Promise<void> => {
    try {
        const application = await AdmissionApplication.findById(req.params.id);
        if (!application) {
            res.status(404).json({ success: false, message: 'Application not found' });
            return;
        }
        res.status(200).json({ success: true, application });
    } catch (error) {
        console.error('Get application error:', error);
        res.status(500).json({ success: false, message: 'Failed to get application' });
    }
};

import { generateApplicationPdf } from '../services/pdfService';

export const downloadApplicationPdf = async (req: Request, res: Response): Promise<void> => {
    try {
        const application = await AdmissionApplication.findById(req.params.id);
        if (!application) {
            res.status(404).json({ success: false, message: 'Application not found' });
            return;
        }

        // Generate PDF buffer on the fly using pdfkit
        const pdfBuffer = await generateApplicationPdf(application);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="application_${application.applicationId}.pdf"`);
        res.status(200).send(pdfBuffer);
    } catch (error) {
        console.error('Download application PDF error:', error);
        res.status(500).json({ success: false, message: 'Failed to generate application PDF' });
    }
};

export const getPublicApplication = async (req: Request, res: Response): Promise<void> => {
    try {
        // Find application by ID
        const application = await AdmissionApplication.findById(req.params.id);
        if (!application) {
            res.status(404).json({ success: false, message: 'Application not found' });
            return;
        }
        res.status(200).json({ success: true, application });
    } catch (error) {
        console.error('Get public application error:', error);
        res.status(500).json({ success: false, message: 'Failed to get application' });
    }
};

export const approveApplication = async (req: Request, res: Response): Promise<void> => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const app = await AdmissionApplication.findById(req.params.id).session(session);
        if (!app) {
            res.status(404).json({ success: false, message: 'Application not found' });
            return;
        }
        if (app.status !== 'PENDING') {
            res.status(400).json({ success: false, message: `Application is already ${app.status}` });
            return;
        }

        const activeSession = await Session.findOne({ year: app.sessionYear }).session(session);
        if (!activeSession) {
            res.status(400).json({ success: false, message: 'Session not found' });
            return;
        }

        const classDoc = await Class.findOne({ className: app.appliedClass }).session(session);
        if (!classDoc) {
            res.status(400).json({ success: false, message: 'Class not found' });
            return;
        }

        // 1. Create or Find User
        let user = null;
        if (app.aadhaarNumber) {
            user = await User.findOne({ "studentProfile.aadhaarNumber": app.aadhaarNumber, role: 'student' }).session(session);
        }

        if (!user) {
            let phoneToUse = app.fatherMobile;
            const existingPhoneUser = await User.findOne({ phone: phoneToUse }).session(session);
            if (existingPhoneUser) {
                // Sibling already registered with this phone number, append aadhaar to bypass unique constraint
                phoneToUse = `${app.fatherMobile}_${app.aadhaarNumber || app._id.toString()}`;
            }

            user = new User({
                phone: phoneToUse,
                role: 'student',
                name: app.studentName,
                photoUrl: app.photoUrl,
                photoPublicId: app.photoPublicId,
                cloudName: app.cloudName,
                studentProfile: {
                    fatherName: app.fatherName,
                    fatherMobile: app.fatherMobile,
                    motherName: app.motherName,
                    motherMobile: app.motherMobile,
                    guardianName: app.guardianName,
                    guardianMobile: app.guardianMobile,
                    dob: app.dateOfBirth,
                    sex: app.sex,
                    religion: app.religion,
                    socialCategory: app.socialCategory,
                    motherTongue: app.motherTongue,
                    aadhaarNumber: app.aadhaarNumber,
                    address: app.address,
                    village: app.village,
                    postOffice: app.postOffice,
                    tehsil: app.tehsil,
                    district: app.district,
                    state: app.state,
                    pinCode: app.pinCode,
                    prevSchoolName: app.prevSchoolName,
                    prevSchoolMedium: app.prevSchoolMedium,
                    stream: app.stream,
                    subjects: app.selectedSubjects,
                    previousExams: app.previousExams,
                    bankAccountNo: app.bankAccountNo,
                    bankName: app.bankName,
                    bankBranch: app.bankBranch,
                    ifscCode: app.ifscCode,
                    bplStatus: app.bplStatus,
                    fatherOccupation: app.fatherOccupation,
                    annualIncome: app.annualIncome,
                    panNumber: app.panNumber,
                    hobbies: app.hobbies,
                    interestInGames: app.interestInGames
                }
            });
            await user.save({ session });
        }

        // 2. Create or find StudentSession
        let studentSession = await StudentSession.findOne({ 
            userId: user._id, 
            sessionId: activeSession._id 
        }).session(session);

        if (!studentSession) {
            // Generate Card No (e.g. NUR-001)
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

            studentSession = new StudentSession({
                userId: user._id,
                sessionId: activeSession._id,
                classId: classDoc._id,
                cardNo,
                station: app.station || undefined,
                dateOfAdmission: new Date()
            });
            await studentSession.save({ session });
        }

        // 3. Generate FeeStructures
        // We assume admission month is April (index 0) for new admissions in standard cycle.
        // For mid-year, this logic might need refinement based on current date.
        // For now, generating from April.
        await generateFeeStructuresForSession(studentSession, classDoc.className, 0, 0);

        // 4. Update Application
        app.status = 'APPROVED';
        app.approvedBy = new mongoose.Types.ObjectId(req.user?.userId);
        app.approvedAt = new Date();
        app.createdUserId = user._id as mongoose.Types.ObjectId;
        await app.save({ session });

        await session.commitTransaction();
        session.endSession();

        // Send WhatsApp notification
        if (app.fatherMobile) {
            const message = `Hello ${app.studentName || 'Student'},\n\nCongratulations! Your admission application (${app.applicationId}) for ${app.appliedClass} has been APPROVED.\n\nYou are now officially registered for the ${app.sessionYear} session.\n\nRegards,\nGreen View Public School`;
            sendWhatsAppMessage(app.fatherMobile, message).catch(err => console.error('Failed to send WA message on approve:', err));
        }

        res.status(200).json({ 
            success: true, 
            message: 'Application approved and student registered successfully',
            user,
            studentSession
        });

    } catch (error: any) {
        await session.abortTransaction();
        session.endSession();
        console.error('Approve application error:', error);
        res.status(500).json({ success: false, message: 'Failed to approve application', error: error.message });
    }
};

export const rejectApplication = async (req: Request, res: Response): Promise<void> => {
    try {
        const { reason } = req.body;
        const app = await AdmissionApplication.findById(req.params.id);
        
        if (!app) {
            res.status(404).json({ success: false, message: 'Application not found' });
            return;
        }
        if (app.status !== 'PENDING') {
            res.status(400).json({ success: false, message: `Application is already ${app.status}` });
            return;
        }

        app.status = 'REJECTED';
        app.rejectionReason = reason;
        app.approvedBy = new mongoose.Types.ObjectId(req.user?.userId);
        app.approvedAt = new Date();
        
        await app.save();

        res.status(200).json({ success: true, message: 'Application rejected successfully' });
    } catch (error) {
        console.error('Reject application error:', error);
        res.status(500).json({ success: false, message: 'Failed to reject application' });
    }
};

export const getStats = async (req: Request, res: Response): Promise<void> => {
    try {
        const pending = await AdmissionApplication.countDocuments({ status: 'PENDING' });
        const approved = await AdmissionApplication.countDocuments({ status: 'APPROVED' });
        const rejected = await AdmissionApplication.countDocuments({ status: 'REJECTED' });

        res.status(200).json({ success: true, stats: { pending, approved, rejected } });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ success: false, message: 'Failed to get stats' });
    }
};

export const deleteApplication = async (req: Request, res: Response): Promise<void> => {
    try {
        await AdmissionApplication.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: 'Application deleted successfully' });
    } catch (error) {
        console.error('Delete application error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete application' });
    }
};
