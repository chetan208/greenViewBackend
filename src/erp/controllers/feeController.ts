import { Request, Response } from 'express';
import FeeStructure from '../../model/erpModels/feeStructure';
import Payment from '../../model/erpModels/payment';
import Session from '../../model/erpModels/session';
import StudentSession from '../../model/erpModels/studentSession';

export const getStudentFees = async (req: Request, res: Response): Promise<void> => {
    try {
        const { studentSessionId } = req.params;
        let fees = await FeeStructure.find({ studentSessionId }).sort({ createdAt: 1 });
        
        // Auto-generate fees if none exist
        if (fees.length === 0) {
            const StudentSession = require('../../model/erpModels/studentSession').default;
            const studentSession = await StudentSession.findById(studentSessionId).populate('classId');
            if (studentSession && studentSession.classId) {
                const { generateFeeStructuresForSession } = require('../services/feeService');
                await generateFeeStructuresForSession(studentSession, studentSession.classId.className, 0, studentSession.previousSessionDues || 0);
                fees = await FeeStructure.find({ studentSessionId }).sort({ createdAt: 1 });
            }
        }

        // Also fetch payments for these fees to give a complete picture
        const feeIds = fees.map(f => f._id);
        const payments = await Payment.find({ feeStructureId: { $in: feeIds } });

        res.status(200).json({ success: true, fees, payments });
    } catch (error) {
        console.error('Get student fees error:', error);
        res.status(500).json({ success: false, message: 'Failed to get student fees' });
    }
};

export const updateFeeStructure = async (req: Request, res: Response): Promise<void> => {
    try {
        const feeId = req.params.feeId;
        const updates = req.body;
        
        // Ensure total is recalculated
        const current = await FeeStructure.findById(feeId);
        if (!current) {
            res.status(404).json({ success: false, message: 'Fee structure not found' });
            return;
        }

        Object.assign(current, updates);
        
        current.total = (current.admissionFee || 0) + (current.tuitionFee || 0) + 
                        (current.examFee || 0) + (current.schoolBusCharges || 0) + 
                        (current.ptmFine || 0) + (current.computerFee || 0) + 
                        (current.tieBeltBooks || 0) + (current.buildingFund || 0) + 
                        (current.annualCharges || 0) + (current.previousSessionDues || 0);

        // Check if total is fully paid now after reduction
        const payments = await Payment.find({ feeStructureId: current._id });
        const totalPaid = payments.reduce((sum, p) => sum + p.amountPaid, 0);
        
        if (totalPaid >= current.total) {
            current.status = 'PAID';
        } else if (totalPaid > 0) {
            current.status = 'PARTIALLY_PAID';
        } else {
            current.status = 'PENDING';
        }

        await current.save();

        res.status(200).json({ success: true, message: 'Fee structure updated', fee: current });
    } catch (error) {
        console.error('Update fee structure error:', error);
        res.status(500).json({ success: false, message: 'Failed to update fee structure' });
    }
};

export const getFeeStats = async (req: Request, res: Response): Promise<void> => {
    try {
        const { session } = req.query;
        if (!session) {
             res.status(400).json({ success: false, message: 'Session is required' });
             return;
        }

        // Find session ID
        const sessionRecord = await Session.findOne({ year: session as string });
        if (!sessionRecord) {
             res.status(404).json({ success: false, message: 'Session not found' });
             return;
        }

        // Total students in session
        const totalStudents = await StudentSession.countDocuments({ sessionId: sessionRecord._id });

        // Get all pending/partially paid fees for this session
        const pendingFees = await FeeStructure.find({
            status: { $in: ['PENDING', 'PARTIALLY_PAID'] }
        }).populate({
            path: 'studentSessionId',
            match: { sessionId: sessionRecord._id }, // Only match this session
            populate: [
                { path: 'userId', select: 'name' },
                { path: 'classId', select: 'className' }
            ]
        });

        // Filter out those where studentSessionId is null (due to match condition)
        const validPendingFees = pendingFees.filter((f: any) => f.studentSessionId != null);

        // Calculate pending amount (total - paid)
        // Wait, totalPaid is in Payment model. We need to fetch payments or we can just subtract total from what is paid?
        // Let's fetch all payments for these valid fees
        const Payment = require('../../model/erpModels/payment').default;
        const feeIds = validPendingFees.map((f: any) => f._id);
        const payments = await Payment.find({ feeStructureId: { $in: feeIds } });

        const paymentMap = new Map();
        payments.forEach((p: any) => {
            const current = paymentMap.get(p.feeStructureId.toString()) || 0;
            paymentMap.set(p.feeStructureId.toString(), current + p.amountPaid);
        });

        const currentMonth = new Date().toLocaleString('en-US', { month: 'long' });

        const currentPendingList: any[] = [];
        const prevPendingList: any[] = [];

        validPendingFees.forEach((f: any) => {
            const paid = paymentMap.get(f._id.toString()) || 0;
            const pendingAmount = f.total - paid;

            if (pendingAmount > 0) {
                const studentSession = f.studentSessionId as any;
                const studentData = {
                    id: studentSession.userId._id, // User ID is used by frontend to fetch student details
                    name: studentSession.userId.name,
                    cardNo: studentSession.cardNo,
                    studentClass: studentSession.classId.className,
                    pendingAmount: pendingAmount
                };

                if (f.month === currentMonth) {
                    currentPendingList.push(studentData);
                } else {
                    prevPendingList.push(studentData);
                }
            }
        });

        res.status(200).json({ 
            success: true, 
            totalStudents,
            currentPendingCount: currentPendingList.length,
            prevPendingCount: prevPendingList.length,
            currentPendingList,
            prevPendingList
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ success: false, message: 'Failed to get stats' });
    }
};

export const getIncomeAnalysis = async (req: Request, res: Response): Promise<void> => {
    try {
        // Implementation for month/class wise income report
        res.status(501).json({ success: false, message: 'Analysis pending implementation' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to get analysis' });
    }
};

export const listFeeStructures = async (req: Request, res: Response): Promise<void> => {
    try {
        const { class: className, month, status, limit = 100 } = req.query;
        
        const filter: any = {};
        if (className) filter.studentClass = className;
        if (month) filter.month = month;
        if (status) filter.status = status;

        const fees = await FeeStructure.find(filter)
            .populate({
                path: 'studentSessionId',
                populate: { path: 'userId', select: 'name phone' }
            })
            .limit(Number(limit))
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, fees });
    } catch (error) {
        console.error('List fee structures error:', error);
        res.status(500).json({ success: false, message: 'Failed to list fee structures' });
    }
};
