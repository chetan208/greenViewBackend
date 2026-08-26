import { Request, Response } from 'express';
import FeeStructure from '../../model/erpModels/feeStructure';
import Payment from '../../model/erpModels/payment';
import Session from '../../model/erpModels/session';
import StudentSession from '../../model/erpModels/studentSession';
import { generateFeeStructuresForSession, syncUnpaidStudentFees } from '../services/feeService';

export const getStudentFees = async (req: Request, res: Response): Promise<void> => {
    try {
        const { studentSessionId } = req.params;
        const studentSession = await StudentSession.findById(studentSessionId).populate('classId');

        let fees = await FeeStructure.find({ studentSessionId }).sort({ createdAt: 1 });
        
        if (studentSession && studentSession.classId) {
            const className = (studentSession.classId as any).className;
            
            // 1. Auto-generate fees if none exist
            if (fees.length === 0) {
                await generateFeeStructuresForSession(studentSession, className, undefined, studentSession.previousSessionDues || 0);
            } else {
                // 2. Sync/verify unpaid fee structures with current fee configuration (PAID ones are preserved)
                await syncUnpaidStudentFees(studentSession, className);
            }
            
            fees = await FeeStructure.find({ studentSessionId }).sort({ createdAt: 1 });
        }

        // Also fetch payments for these fees to give a complete picture
        const feeIds = fees.map(f => f._id);
        const payments = await Payment.find({ feeStructureId: { $in: feeIds } });

        const feesWithPayments = fees.map(f => {
            const feeObj: any = f.toObject ? f.toObject() : { ...f };
            feeObj.id = f._id.toString();
            feeObj.payments = payments.filter(p => p.feeStructureId.toString() === f._id.toString());
            return feeObj;
        });

        res.status(200).json({ 
            success: true, 
            fees: feesWithPayments, 
            feeStructures: feesWithPayments,
            student: { feeStructures: feesWithPayments },
            payments 
        });
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
        current.isManuallyEdited = true;
        
        current.total = (current.admissionFee || 0) + (current.tuitionFee || 0) + 
                        (current.examFee || 0) + (current.schoolBusCharges || 0) + 
                        (current.computerFee || 0) + (current.smartClassFee || 0) + 
                        (current.sportsFee || 0) + (current.ptmFine || 0) + 
                        (current.lateFee || 0) + (current.annualCharges || 0) + 
                        (current.otherCharges || 0) + (current.previousSessionDues || 0);

        // Check if total is fully paid now after reduction
        const payments = await Payment.find({ feeStructureId: current._id });
        const totalPaid = payments.reduce((sum, p) => sum + p.amountPaid, 0);
        
        if (totalPaid >= current.total && current.total > 0) {
            current.status = 'PAID';
        } else if (totalPaid > 0) {
            current.status = 'PARTIALLY_PAID';
        } else {
            current.status = 'PENDING';
        }

        await current.save();

        const updatedFeeObj: any = current.toObject ? current.toObject() : { ...current };
        updatedFeeObj.id = current._id.toString();
        updatedFeeObj.payments = payments;

        res.status(200).json({ success: true, message: 'Fee structure updated', fee: updatedFeeObj, feeStructure: updatedFeeObj });
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

        // Fetch all payments for these valid fees
        const feeIds = validPendingFees.map((f: any) => f._id);
        const payments = await Payment.find({ feeStructureId: { $in: feeIds } });

        const paymentMap = new Map();
        payments.forEach((p: any) => {
            const current = paymentMap.get(p.feeStructureId.toString()) || 0;
            paymentMap.set(p.feeStructureId.toString(), current + p.amountPaid);
        });

        const currentMonth = new Date().toLocaleString('en-US', { month: 'long' });

        const currentPendingMap = new Map<string, any>();
        const prevPendingMap = new Map<string, any>();

        validPendingFees.forEach((f: any) => {
            const paid = paymentMap.get(f._id.toString()) || 0;
            const pendingAmount = f.total - paid;

            if (pendingAmount > 0 && f.studentSessionId) {
                const studentSession = f.studentSessionId as any;
                const studentId = studentSession._id.toString();
                const isCurrentMonth = (f.month === currentMonth || f.month?.startsWith(currentMonth));
                const targetMap = isCurrentMonth ? currentPendingMap : prevPendingMap;

                if (targetMap.has(studentId)) {
                    const existing = targetMap.get(studentId);
                    existing.pendingAmount = Math.round((existing.pendingAmount + pendingAmount) * 100) / 100;
                } else {
                    targetMap.set(studentId, {
                        id: studentSession._id.toString(),
                        userId: studentSession.userId?._id?.toString() || studentSession.userId?.toString(),
                        name: studentSession.userId?.name || 'Student',
                        cardNo: studentSession.cardNo,
                        studentClass: studentSession.classId?.className || f.studentClass,
                        pendingAmount: Math.round(pendingAmount * 100) / 100
                    });
                }
            }
        });

        const currentPendingList = Array.from(currentPendingMap.values());
        const prevPendingList = Array.from(prevPendingMap.values());

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
