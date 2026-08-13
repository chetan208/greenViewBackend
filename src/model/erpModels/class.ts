import mongoose, { Schema, Document } from 'mongoose';

export interface IClass extends Document {
    className: string;
    sections?: string[];
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

const classSchema = new Schema<IClass>({
    className: { type: String, required: true, unique: true },
    sections: [{ type: String }],
    admissionFee: { type: Number, default: 0 },
    tuitionFee: { type: Number, default: 0 },
    examFee: { type: Number, default: 0 },
    computerFee: { type: Number, default: 0 },
    ptmFine: { type: Number, default: 0 },
    buildingFund: { type: Number, default: 0 },
    annualCharges: { type: Number, default: 0 },
    tieBeltBooks: { type: Number, default: 0 },
}, { timestamps: true });

const Class = mongoose.model<IClass>('Class', classSchema);
export default Class;
