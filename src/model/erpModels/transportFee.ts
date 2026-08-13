import mongoose, { Schema, Document } from 'mongoose';

export interface ITransportFee extends Document {
    station: string;
    amount: number;
    createdAt: Date;
    updatedAt: Date;
}

const transportFeeSchema = new Schema<ITransportFee>({
    station: { type: String, required: true, unique: true },
    amount: { type: Number, default: 0 },
}, { timestamps: true });

const TransportFee = mongoose.model<ITransportFee>('TransportFee', transportFeeSchema);
export default TransportFee;
