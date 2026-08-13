import { Request, Response } from 'express';
import mongoose from 'mongoose';
import FeeStructure from '../../model/erpModels/feeStructure';
import Payment from '../../model/erpModels/payment';

const generateReceiptNo = async (): Promise<string> => {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const lastPayment = await Payment.findOne({ receiptNo: new RegExp(`^REC-${dateStr}-`) }).sort({ receiptNo: -1 });
    
    let nextNum = 1;
    if (lastPayment) {
        const parts = lastPayment.receiptNo.split('-');
        nextNum = parseInt(parts[2], 10) + 1;
    }
    
    return `REC-${dateStr}-${nextNum.toString().padStart(4, '0')}`;
};

export const makePayment = async (req: Request, res: Response): Promise<void> => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { studentSessionId, amountPaid, paymentMode, feeStructureId } = req.body;

        if (!amountPaid || amountPaid <= 0) {
            res.status(400).json({ success: false, message: 'Invalid payment amount' });
            return;
        }

        let pendingFees = [];
        
        // If specific fee structure is targeted, just pay that one
        if (feeStructureId) {
            const fee = await FeeStructure.findById(feeStructureId).session(session);
            if (!fee || fee.status === 'PAID') {
                res.status(400).json({ success: false, message: 'Fee structure not found or already paid' });
                return;
            }
            pendingFees.push(fee);
        } else {
            // Otherwise, get all pending and partially paid fees for the student session (FIFO)
            pendingFees = await FeeStructure.find({
                studentSessionId,
                status: { $in: ['PENDING', 'PARTIALLY_PAID'] }
            }).sort({ createdAt: 1 }).session(session);
        }

        if (pendingFees.length === 0) {
            res.status(400).json({ success: false, message: 'No pending fees found' });
            return;
        }

        let remainingAmount = amountPaid;
        const paymentsMade = [];

        for (const fee of pendingFees) {
            if (remainingAmount <= 0) break;

            // Calculate how much is already paid for this fee structure
            const existingPayments = await Payment.find({ feeStructureId: fee._id }).session(session);
            const totalPaidSoFar = existingPayments.reduce((sum, p) => sum + p.amountPaid, 0);
            
            const actualDue = fee.total - totalPaidSoFar;
            if (actualDue <= 0) continue; // Already fully paid, should be marked PAID

            const amountToAllocate = Math.min(remainingAmount, actualDue);
            
            // Create payment record
            const receiptNo = await generateReceiptNo();
            const payment = new Payment({
                feeStructureId: fee._id,
                amountPaid: amountToAllocate,
                paymentMode,
                receiptNo
            });
            await payment.save({ session });
            paymentsMade.push(payment);

            // Update FeeStructure status
            const newTotalPaid = totalPaidSoFar + amountToAllocate;
            fee.status = newTotalPaid >= fee.total ? 'PAID' : 'PARTIALLY_PAID';
            await fee.save({ session });

            remainingAmount -= amountToAllocate;
        }

        if (remainingAmount > 0) {
            // Unallocated amount - in a real system, you might want an "advance balance" or wallet system
            console.warn(`Payment has ${remainingAmount} unallocated amount`);
        }

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ 
            success: true, 
            message: 'Payment processed successfully',
            payments: paymentsMade,
            unallocated: remainingAmount > 0 ? remainingAmount : 0
        });
    } catch (error: any) {
        await session.abortTransaction();
        session.endSession();
        console.error('Make payment error:', error);
        res.status(500).json({ success: false, message: 'Failed to process payment', error: error.message });
    }
};

export const getReceipt = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params; // payment _id or receiptNo
        const payment = await Payment.findOne({
            $or: [
                { _id: mongoose.isValidObjectId(id) ? id : null },
                { receiptNo: id }
            ]
        }).populate({
            path: 'feeStructureId',
            populate: {
                path: 'studentSessionId',
                populate: ['userId', 'classId']
            }
        });

        if (!payment) {
            res.status(404).json({ success: false, message: 'Receipt not found' });
            return;
        }

        res.status(200).json({ success: true, payment });
    } catch (error) {
        console.error('Get receipt error:', error);
        res.status(500).json({ success: false, message: 'Failed to get receipt' });
    }
};
