import mongoose, { Schema, Document } from 'mongoose';

export interface IClassMonthlyFee extends Document {
    className: string;
    monthName: string;
    admissionFee: number;
    tuitionFee: number;
    examFee: number;
    computerFee: number;
    ptmFine: number;
    buildingFund: number;
    annualCharges: number;
    tieBeltBooks: number;
    createdAt: Date;
    updatedAt: Date;
}

const classMonthlyFeeSchema = new Schema<IClassMonthlyFee>({
    className: { type: String, required: true },
    monthName: { type: String, required: true },
    admissionFee: { type: Number, default: 0 },
    tuitionFee: { type: Number, default: 0 },
    examFee: { type: Number, default: 0 },
    computerFee: { type: Number, default: 0 },
    ptmFine: { type: Number, default: 0 },
    buildingFund: { type: Number, default: 0 },
    annualCharges: { type: Number, default: 0 },
    tieBeltBooks: { type: Number, default: 0 },
}, { timestamps: true });

classMonthlyFeeSchema.index({ className: 1, monthName: 1 }, { unique: true });

const ClassMonthlyFee = mongoose.model<IClassMonthlyFee>('ClassMonthlyFee', classMonthlyFeeSchema);
export default ClassMonthlyFee;
