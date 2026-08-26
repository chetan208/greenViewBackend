import { Request, Response } from 'express';
import mongoose from 'mongoose';
import FeeStructure from '../../model/erpModels/feeStructure';
import Payment from '../../model/erpModels/payment';
import StudentSession from '../../model/erpModels/studentSession';
import { sendWhatsAppMessage } from '../services/whatsappService';

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
        const { studentSessionId, studentId, amountPaid, paymentMode, feeStructureId } = req.body;
        const targetId = studentSessionId || studentId || req.body.id;

        const numericAmount = parseFloat(amountPaid);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            res.status(400).json({ success: false, message: 'Invalid payment amount' });
            return;
        }

        let studentSessionDoc = null;
        if (targetId) {
            studentSessionDoc = await StudentSession.findById(targetId).session(session);
            if (!studentSessionDoc) {
                studentSessionDoc = await StudentSession.findOne({ userId: targetId }).sort({ createdAt: -1 }).session(session);
            }
        }

        let pendingFees: any[] = [];
        
        // 1. If specific fee structure is targeted, pay that one
        if (feeStructureId) {
            const fee = await FeeStructure.findById(feeStructureId).session(session);
            if (!fee) {
                res.status(400).json({ success: false, message: 'Fee structure not found' });
                return;
            }
            pendingFees.push(fee);
            if (!studentSessionDoc) {
                studentSessionDoc = await StudentSession.findById(fee.studentSessionId).session(session);
            }
        } else if (studentSessionDoc) {
            // 2. Otherwise, get all pending and partially paid fees for the student session (FIFO)
            pendingFees = await FeeStructure.find({
                studentSessionId: studentSessionDoc._id,
                status: { $in: ['PENDING', 'PARTIALLY_PAID'] }
            }).sort({ createdAt: 1 }).session(session);

            // Fallback: if no pending fees, fetch the latest fee structure
            if (pendingFees.length === 0) {
                const latestFee = await FeeStructure.findOne({
                    studentSessionId: studentSessionDoc._id
                }).sort({ createdAt: -1 }).session(session);
                if (latestFee) {
                    pendingFees.push(latestFee);
                }
            }
        }

        if (pendingFees.length === 0) {
            res.status(400).json({ success: false, message: 'No fee structures found for this student to apply payment' });
            return;
        }

        let remainingAmount = numericAmount;
        const paymentsMade = [];

        for (const fee of pendingFees) {
            if (remainingAmount <= 0) break;

            // Calculate how much is already paid for this fee structure
            const existingPayments = await Payment.find({ feeStructureId: fee._id }).session(session);
            const totalPaidSoFar = existingPayments.reduce((sum, p) => sum + p.amountPaid, 0);
            
            const actualDue = fee.total - totalPaidSoFar;
            // If fee has no due but it's the only one targeted, allocate remaining
            const amountToAllocate = actualDue > 0 ? Math.min(remainingAmount, actualDue) : remainingAmount;
            if (amountToAllocate <= 0) continue;

            // Create payment record
            const receiptNo = await generateReceiptNo();
            const payment = new Payment({
                feeStructureId: fee._id,
                amountPaid: amountToAllocate,
                paymentMode: paymentMode || 'CASH',
                receiptNo
            });
            await payment.save({ session });
            paymentsMade.push(payment);

            // Update FeeStructure status
            const newTotalPaid = totalPaidSoFar + amountToAllocate;
            if (newTotalPaid >= fee.total && fee.total > 0) {
                fee.status = 'PAID';
            } else if (newTotalPaid > 0) {
                fee.status = 'PARTIALLY_PAID';
            } else {
                fee.status = 'PENDING';
            }
            await fee.save({ session });

            remainingAmount -= amountToAllocate;
        }

        await session.commitTransaction();
        session.endSession();

        // Send WhatsApp Payment Receipt Confirmation Notification
        if (studentSessionDoc) {
            try {
                const studentSession = await StudentSession.findById(studentSessionDoc._id)
                    .populate<{ userId: any }>('userId')
                    .populate<{ classId: any }>('classId');

                if (studentSession && studentSession.userId) {
                    const userObj = studentSession.userId as any;
                    const parentPhone = userObj.phone || userObj.studentProfile?.fatherMobile || userObj.studentProfile?.motherMobile;
                    const studentName = userObj.name || 'Student';
                    const className = (studentSession.classId as any)?.className || '';
                    const cardNo = studentSession.cardNo || '';

                    // Calculate remaining balance for student
                    const allFees = await FeeStructure.find({ studentSessionId: studentSession._id });
                    const feeIds = allFees.map(f => f._id);
                    const allPayments = await Payment.find({ feeStructureId: { $in: feeIds } });
                    const totalBilling = allFees.reduce((sum, f) => sum + (f.total || 0), 0);
                    const totalPaid = allPayments.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
                    const remainingBal = Math.max(0, Math.round((totalBilling - totalPaid) * 100) / 100);

                    const lastReceiptNo = paymentsMade[0]?.receiptNo || 'N/A';

                    const waMessage = `✨ *GREEN VIEW PUBLIC SCHOOL* ✨\n` +
                        `*FEE PAYMENT RECEIPT CONFIRMATION*\n\n` +
                        `Dear Parent,\n` +
                        `We have successfully received the fee payment for your ward:\n\n` +
                        `👤 *Student:* ${studentName}\n` +
                        `🏫 *Class:* ${className}\n` +
                        `💳 *Roll/Card No:* ${cardNo}\n` +
                        `🧾 *Receipt No:* ${lastReceiptNo}\n` +
                        `💰 *Amount Received:* ₹${numericAmount.toLocaleString('en-IN')}\n` +
                        `💳 *Payment Mode:* ${paymentMode || 'CASH'}\n` +
                        `📌 *Remaining Session Dues:* ₹${remainingBal.toLocaleString('en-IN')}\n\n` +
                        `Thank you for your timely payment!\n` +
                        `For queries, please contact School Accounts Counter.\n\n` +
                        `_Green View Public School, Lower Hatwas_`;

                    if (parentPhone) {
                        sendWhatsAppMessage(parentPhone, waMessage).catch(err => {
                            console.error('[WhatsApp] Failed to send payment confirmation:', err);
                        });
                    }
                }
            } catch (waErr) {
                console.error('[WhatsApp] Error building payment message:', waErr);
            }
        }

        res.status(200).json({ 
            success: true, 
            message: `Payment of ₹${numericAmount} collected successfully`, 
            payments: paymentsMade 
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
        const { feeStructureId } = req.params;
        const payments = await Payment.find({ feeStructureId }).sort({ createdAt: -1 });
        const fee = await FeeStructure.findById(feeStructureId).populate({
            path: 'studentSessionId',
            populate: [
                { path: 'userId' },
                { path: 'classId' }
            ]
        });

        if (!fee) {
            res.status(404).json({ success: false, message: 'Fee structure not found' });
            return;
        }

        res.status(200).json({ success: true, fee, payments });
    } catch (error) {
        console.error('Get receipt error:', error);
        res.status(500).json({ success: false, message: 'Failed to get receipt' });
    }
};
