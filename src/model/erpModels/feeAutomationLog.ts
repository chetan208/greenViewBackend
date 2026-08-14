import mongoose, { Document, Schema } from 'mongoose';

export interface IFeeAutomationLog extends Document {
  studentSessionId: mongoose.Types.ObjectId;
  monthStr: string;
  status: string;
  createdAt: Date;
}

const FeeAutomationLogSchema: Schema = new Schema({
  studentSessionId: { type: Schema.Types.ObjectId, ref: 'StudentSession', required: true },
  monthStr: { type: String, required: true },
  status: { type: String, required: true, enum: ['PROCESSED', 'FAILED'] }
}, { 
  timestamps: true 
});

// Prevent processing the same student for the same month twice
FeeAutomationLogSchema.index({ studentSessionId: 1, monthStr: 1 }, { unique: true });

export default mongoose.models.FeeAutomationLog || mongoose.model<IFeeAutomationLog>('FeeAutomationLog', FeeAutomationLogSchema);
