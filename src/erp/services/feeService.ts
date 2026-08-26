import mongoose from 'mongoose';
import ClassMonthlyFee from '../../model/erpModels/classMonthlyFee';
import Class from '../../model/erpModels/class';
import { IStudentSession } from '../../model/erpModels/studentSession';
import TransportFee from '../../model/erpModels/transportFee';
import FeeStructure from '../../model/erpModels/feeStructure';
import Payment from '../../model/erpModels/payment';

export const getAdmissionStartMonthIndex = (dateOfAdmission?: Date | string): number => {
    if (!dateOfAdmission) return 0;
    const date = new Date(dateOfAdmission);
    if (isNaN(date.getTime())) return 0;
    
    const month = date.getMonth(); // 0 = Jan, 1 = Feb, 2 = Mar, 3 = Apr, 4 = May, 5 = Jun, 6 = Jul, 7 = Aug, 8 = Sep, 9 = Oct, 10 = Nov, 11 = Dec
    
    // Academic year months order (April to March):
    // 0: April (month 3), 1: May (month 4), 2: June (month 5), 3: July (month 6), 
    // 4: August (month 7), 5: September (month 8), 6: October (month 9), 
    // 7: November (month 10), 8: December (month 11), 9: January (month 0), 
    // 10: February (month 1), 11: March (month 2)
    const monthOrder = [3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1, 2];
    const index = monthOrder.indexOf(month);
    return index >= 0 ? index : 0;
};

export const getCurrentMonthIndex = (date: Date = new Date()): number => {
    const month = date.getMonth();
    const monthOrder = [3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1, 2];
    const index = monthOrder.indexOf(month);
    return index >= 0 ? index : 0;
};

export const calculateMonthlyFee = async (
    studentSession: IStudentSession, 
    monthStr: string, 
    className: string,
    isAdmissionMonth: boolean,
    previousSessionDues: number = 0
) => {
    const monthNameOnly = monthStr.split('-')[0];

    // 1. Fetch Class Monthly Overrides (matches "April" or "April-2026")
    let classFees = await ClassMonthlyFee.findOne({ 
        className, 
        monthName: { $in: [monthStr, monthNameOnly] } 
    });
    
    // Fallback to Class default fees if override not found
    if (!classFees) {
        classFees = await Class.findOne({ className }) as any;
    }

    if (!classFees) {
        throw new Error(`Fee configuration not found for class: ${className}`);
    }

    // 2. Transport Fee
    let schoolBusCharges = 0;
    if (studentSession.station) {
        const transport = await TransportFee.findOne({ station: studentSession.station });
        if (transport) {
            schoolBusCharges = Math.max(0, transport.amount - (studentSession.discountBus || 0));
        }
    }

    // 3. Apply Student Discounts
    const tuitionFee = Math.max(0, (classFees.tuitionFee || 0) - (studentSession.discountTuition || 0));
    const admissionFee = isAdmissionMonth ? Math.max(0, (classFees.admissionFee || 0) - (studentSession.discountAdmission || 0)) : 0;
    const examFee = Math.max(0, (classFees.examFee || 0) - (studentSession.discountExam || 0));
    const computerFee = Math.max(0, (classFees.computerFee || 0) - (studentSession.discountComputer || 0));
    const annualCharges = isAdmissionMonth ? Math.max(0, (classFees.annualCharges || 0) - (studentSession.discountAnnual || 0)) : 0;
    
    // Other fixed components
    const ptmFine = classFees.ptmFine || 0;
    const smartClassFee = classFees.smartClassFee || 0;
    const sportsFee = classFees.sportsFee || 0;
    const lateFee = classFees.lateFee || 0;
    const otherCharges = classFees.otherCharges || 0;

    // 4. Total Calculation
    const total = admissionFee + tuitionFee + examFee + schoolBusCharges + 
                  computerFee + smartClassFee + sportsFee + ptmFine + 
                  lateFee + annualCharges + otherCharges + previousSessionDues;

    return {
        studentSessionId: studentSession._id,
        month: monthStr,
        studentClass: className,
        admissionFee,
        tuitionFee,
        examFee,
        schoolBusCharges,
        computerFee,
        smartClassFee,
        sportsFee,
        ptmFine,
        lateFee,
        annualCharges,
        otherCharges,
        previousSessionDues,
        total,
        status: 'PENDING'
    };
};

export const generateFeeStructuresForSession = async (
    studentSession: IStudentSession,
    className: string,
    startMonthIndex?: number,
    previousDues: number = 0,
    endMonthIndex?: number
) => {
    const months = [
        "April", "May", "June", "July", "August", "September", 
        "October", "November", "December", "January", "February", "March"
    ];

    // Start from admission month
    let actualStartIndex = startMonthIndex;
    if (actualStartIndex === undefined || actualStartIndex === null) {
        const admissionDate = studentSession.dateOfAdmission || (studentSession as any).createdAt;
        actualStartIndex = getAdmissionStartMonthIndex(admissionDate);
    }

    // End at current month (or specified endMonthIndex)
    let actualEndIndex = endMonthIndex;
    if (actualEndIndex === undefined || actualEndIndex === null) {
        actualEndIndex = getCurrentMonthIndex();
    }

    actualEndIndex = Math.min(11, Math.max(actualStartIndex, actualEndIndex));

    // Check existing fees to avoid duplicate month generation
    const existingFees = await FeeStructure.find({ studentSessionId: studentSession._id });
    const existingMonthSet = new Set(existingFees.map(f => f.month.split('-')[0]));
    const hasAnyExistingFees = existingFees.length > 0;

    const feeStructures = [];

    for (let i = actualStartIndex; i <= actualEndIndex; i++) {
        const monthStr = months[i];
        
        if (existingMonthSet.has(monthStr)) {
            continue;
        }

        // One-time admission fee & annual charges apply ONLY in the student's FIRST ever generated month
        const isAdmissionMonth = (!hasAnyExistingFees && i === actualStartIndex);
        const dues = isAdmissionMonth ? previousDues : 0;

        const feeData = await calculateMonthlyFee(
            studentSession, 
            monthStr, 
            className, 
            isAdmissionMonth, 
            dues
        );

        feeStructures.push(feeData);
    }

    if (feeStructures.length > 0) {
        await FeeStructure.insertMany(feeStructures);
    }
};

export const syncUnpaidStudentFees = async (studentSession: IStudentSession, className: string) => {
    const admissionDate = studentSession.dateOfAdmission || (studentSession as any).createdAt;
    const startIdx = getAdmissionStartMonthIndex(admissionDate);
    const currentIdx = getCurrentMonthIndex();

    // 1. Generate missing fee structures from admission month up to current month
    await generateFeeStructuresForSession(
        studentSession, 
        className, 
        startIdx, 
        (studentSession as any).previousSessionDues || 0, 
        currentIdx
    );

    // 2. Fetch all fee structures for this student session
    const fees = await FeeStructure.find({ studentSessionId: studentSession._id }).sort({ createdAt: 1 });
    if (fees.length === 0) return;

    const feeIds = fees.map(f => f._id);
    const payments = await Payment.find({ feeStructureId: { $in: feeIds } });
    
    const paidMap = new Map<string, number>();
    payments.forEach(p => {
        const key = p.feeStructureId.toString();
        paidMap.set(key, (paidMap.get(key) || 0) + (p.amountPaid || 0));
    });

    const firstFeeId = fees[0]?._id?.toString();

    for (const fee of fees) {
        // STRICT RULE: If already fully PAID (Settled) or Manually Edited by Admin, DO NOT overwrite!
        if (fee.status === 'PAID' || fee.isManuallyEdited) {
            continue;
        }

        // Admission month is the student's FIRST fee structure
        const isAdmissionMonth = (fee._id.toString() === firstFeeId);

        const newFeeData = await calculateMonthlyFee(
            studentSession,
            fee.month,
            className,
            isAdmissionMonth,
            fee.previousSessionDues || 0
        );

        // Update unpaid fee structure heads with latest configuration
        fee.tuitionFee = newFeeData.tuitionFee;
        fee.admissionFee = newFeeData.admissionFee;
        fee.examFee = newFeeData.examFee;
        fee.schoolBusCharges = newFeeData.schoolBusCharges;
        fee.computerFee = newFeeData.computerFee;
        fee.smartClassFee = newFeeData.smartClassFee;
        fee.sportsFee = newFeeData.sportsFee;
        fee.ptmFine = newFeeData.ptmFine;
        fee.lateFee = newFeeData.lateFee;
        fee.annualCharges = newFeeData.annualCharges;
        fee.otherCharges = newFeeData.otherCharges;
        fee.total = newFeeData.total;

        // Recalculate status based on payments already made
        const paidAmount = paidMap.get(fee._id.toString()) || 0;
        if (paidAmount >= fee.total && fee.total > 0) {
            fee.status = 'PAID';
        } else if (paidAmount > 0) {
            fee.status = 'PARTIALLY_PAID';
        } else {
            fee.status = 'PENDING';
        }

        await fee.save();
    }
};

export const syncPendingFeesAfterDiscountUpdate = async (studentSession: IStudentSession, className: string) => {
    await syncUnpaidStudentFees(studentSession, className);
};
