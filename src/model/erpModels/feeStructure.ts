import mongoose, { Schema, Document } from 'mongoose';

export interface IFeeStructure extends Document {
    studentSessionId: mongoose.Types.ObjectId;
    month: string;
    studentClass: string;

    admissionFee: number;
    tuitionFee: number;
    examFee: number;
    schoolBusCharges: number;
    ptmFine: number;
    computerFee: number;
    tieBeltBooks: number;
    buildingFund: number;
    annualCharges: number;
    previousSessionDues: number;

    total: number;
    status: 'PENDING' | 'PARTIALLY_PAID' | 'PAID';

    createdAt: Date;
    updatedAt: Date;
}

const feeStructureSchema = new Schema<IFeeStructure>({
    studentSessionId: { type: Schema.Types.ObjectId, ref: 'StudentSession', required: true },
    month: { type: String, required: true },
    studentClass: { type: String, required: true },

    admissionFee: { type: Number, default: 0 },
    tuitionFee: { type: Number, default: 0 },
    examFee: { type: Number, default: 0 },
    schoolBusCharges: { type: Number, default: 0 },
    ptmFine: { type: Number, default: 0 },
    computerFee: { type: Number, default: 0 },
    tieBeltBooks: { type: Number, default: 0 },
    buildingFund: { type: Number, default: 0 },
    annualCharges: { type: Number, default: 0 },
    previousSessionDues: { type: Number, default: 0 },

    total: { type: Number, default: 0 },
    status: { type: String, enum: ['PENDING', 'PARTIALLY_PAID', 'PAID'], default: 'PENDING', index: true },
}, { timestamps: true });

feeStructureSchema.index({ studentSessionId: 1, month: 1 }, { unique: true });

const FeeStructure = mongoose.model<IFeeStructure>('FeeStructure', feeStructureSchema);
export default FeeStructure;
