import mongoose from 'mongoose';
import ClassMonthlyFee from '../../model/erpModels/classMonthlyFee';
import Class from '../../model/erpModels/class';
import { IStudentSession } from '../../model/erpModels/studentSession';
import TransportFee from '../../model/erpModels/transportFee';
import FeeStructure from '../../model/erpModels/feeStructure';

export const calculateMonthlyFee = async (
    studentSession: IStudentSession, 
    monthStr: string, 
    className: string,
    isAdmissionMonth: boolean,
    previousSessionDues: number = 0
) => {
    // 1. Fetch Class Monthly Overrides
    let classFees = await ClassMonthlyFee.findOne({ className, monthName: monthStr });
    
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
    const tieBeltBooks = isAdmissionMonth ? (classFees.tieBeltBooks || 0) : 0;
    const buildingFund = isAdmissionMonth ? (classFees.buildingFund || 0) : 0;

    // 4. Total Calculation
    const total = admissionFee + tuitionFee + examFee + schoolBusCharges + 
                  ptmFine + computerFee + tieBeltBooks + buildingFund + 
                  annualCharges + previousSessionDues;

    return {
        studentSessionId: studentSession._id,
        month: monthStr,
        studentClass: className,
        admissionFee,
        tuitionFee,
        examFee,
        schoolBusCharges,
        ptmFine,
        computerFee,
        tieBeltBooks,
        buildingFund,
        annualCharges,
        previousSessionDues,
        total,
        status: 'PENDING'
    };
};

export const generateFeeStructuresForSession = async (
    studentSession: IStudentSession,
    className: string,
    startMonthIndex: number = 0, // 0 = April, 1 = May, etc.
    previousDues: number = 0
) => {
    const months = [
        "April", "May", "June", "July", "August", "September", 
        "October", "November", "December", "January", "February", "March"
    ];

    const feeStructures = [];
    
    // Determine the year logic (e.g. session 2026-27)
    // For simplicity, monthStr format will be like "April-2026"
    // We'll need a helper to append the correct year based on the session string
    // Assuming session is populated or passed, but let's just use month names for now or "Month Year"

    for (let i = startMonthIndex; i < months.length; i++) {
        const monthStr = months[i];
        const isAdmissionMonth = (i === startMonthIndex); // Apply one-time charges in the first generated month
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

    // Insert all
    if (feeStructures.length > 0) {
        await FeeStructure.insertMany(feeStructures);
    }
};

export const syncPendingFeesAfterDiscountUpdate = async (studentSession: IStudentSession, className: string) => {
    // 1. Fetch pending fees for this student session
    const pendingFees = await FeeStructure.find({
        studentSessionId: studentSession._id,
        status: 'PENDING'
    });

    for (const fee of pendingFees) {
        // We can determine if it was the admission month if it previously had one-time charges
        // Alternatively, since calculateMonthlyFee recalculates EVERYTHING, we can just use the previous values to detect if it was an admission month.
        // Wait, what if the discount brought the admission fee to 0? We can check if `tieBeltBooks` or `buildingFund` > 0, which are also one-time but not discountable.
        // Or if ANY of the one-time charges were > 0.
        const isAdmissionMonth = (fee.admissionFee > 0 || fee.annualCharges > 0 || fee.tieBeltBooks > 0 || fee.buildingFund > 0);
        
        const newFeeData = await calculateMonthlyFee(
            studentSession,
            fee.month,
            className,
            isAdmissionMonth,
            fee.previousSessionDues
        );

        // Update the document
        fee.tuitionFee = newFeeData.tuitionFee;
        fee.admissionFee = newFeeData.admissionFee;
        fee.examFee = newFeeData.examFee;
        fee.schoolBusCharges = newFeeData.schoolBusCharges;
        fee.computerFee = newFeeData.computerFee;
        fee.annualCharges = newFeeData.annualCharges;
        fee.ptmFine = newFeeData.ptmFine;
        fee.total = newFeeData.total;
        
        await fee.save();
    }
};
