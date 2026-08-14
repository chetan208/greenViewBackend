import mongoose, { Document, Schema } from 'mongoose';

export interface IWhatsAppSession extends Document {
  sessionId: string;
  dataKey: string;
  category: string;
  value: string;
  createdAt: Date;
  updatedAt: Date;
}

const WhatsAppSessionSchema: Schema = new Schema({
  sessionId: { type: String, required: true, index: true },
  dataKey: { type: String, required: true },
  category: { type: String, required: true },
  value: { type: String, required: true }
}, { 
  timestamps: true 
});

// Compound unique index enables efficient upserts and cleanup
WhatsAppSessionSchema.index({ sessionId: 1, dataKey: 1 }, { unique: true });

export default mongoose.models.WhatsAppSession || mongoose.model<IWhatsAppSession>('WhatsAppSession', WhatsAppSessionSchema);
