import mongoose, { Schema, Document } from 'mongoose';

export interface IFeeAutomationSettings extends Document<string> {
    _id: string; // "singleton"
    isEnabled: boolean;
    startDay: number;
    windowDays: number;
    createdAt: Date;
    updatedAt: Date;
}

const feeAutomationSettingsSchema = new Schema<IFeeAutomationSettings>({
    _id: { type: String, default: 'singleton' },
    isEnabled: { type: Boolean, default: false },
    startDay: { type: Number, default: 1 },
    windowDays: { type: Number, default: 3 },
}, { timestamps: true });

export const FeeAutomationSettings = mongoose.model<IFeeAutomationSettings>('FeeAutomationSettings', feeAutomationSettingsSchema);

export interface IFeeAutomationLog extends Document {
    studentSessionId: mongoose.Types.ObjectId;
    monthStr: string;
    status: 'SUCCESS' | 'ERROR';
    createdAt: Date;
    updatedAt: Date;
}

const feeAutomationLogSchema = new Schema<IFeeAutomationLog>({
    studentSessionId: { type: Schema.Types.ObjectId, ref: 'StudentSession', required: true },
    monthStr: { type: String, required: true },
    status: { type: String, enum: ['SUCCESS', 'ERROR'], required: true },
}, { timestamps: true });

feeAutomationLogSchema.index({ studentSessionId: 1, monthStr: 1 }, { unique: true });

export const FeeAutomationLog = mongoose.model<IFeeAutomationLog>('FeeAutomationLog', feeAutomationLogSchema);
