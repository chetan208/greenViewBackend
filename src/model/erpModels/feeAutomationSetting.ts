import mongoose, { Document, Schema } from 'mongoose';

export interface IFeeAutomationSetting extends Document {
  isEnabled: boolean;
  startDay: number;
  windowDays: number;
  updatedAt: Date;
}

const FeeAutomationSettingSchema: Schema = new Schema({
  // Use a fixed id since it's a singleton
  _id: { type: String, default: 'singleton' },
  isEnabled: { type: Boolean, default: false },
  startDay: { type: Number, default: 1 },
  windowDays: { type: Number, default: 3 }
}, { 
  timestamps: true 
});

export default mongoose.models.FeeAutomationSetting || mongoose.model<IFeeAutomationSetting>('FeeAutomationSetting', FeeAutomationSettingSchema);
