import mongoose, { Schema, Document } from 'mongoose';

export interface IClass extends Document {
    className: string;
    sections?: string[];
    admissionFee: number;
    tuitionFee: number;
    examFee: number;
    computerFee: number;
    smartClassFee: number;
    sportsFee: number;
    ptmFine: number;
    lateFee: number;
    annualCharges: number;
    otherCharges: number;
    createdAt: Date;
    updatedAt: Date;
}

const classSchema = new Schema<IClass>({
    className: { type: String, required: true, unique: true },
    sections: [{ type: String }],
    admissionFee: { type: Number, default: 0 },
    tuitionFee: { type: Number, default: 0 },
    examFee: { type: Number, default: 0 },
    computerFee: { type: Number, default: 0 },
    smartClassFee: { type: Number, default: 0 },
    sportsFee: { type: Number, default: 0 },
    ptmFine: { type: Number, default: 0 },
    lateFee: { type: Number, default: 0 },
    annualCharges: { type: Number, default: 0 },
    otherCharges: { type: Number, default: 0 },
}, { timestamps: true });

const Class = mongoose.model<IClass>('Class', classSchema);
export default Class;
