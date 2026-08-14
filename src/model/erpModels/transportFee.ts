import mongoose, { Schema, Document } from 'mongoose';

export interface ITransportFee extends Document {
    station: string;
    amount: number;
    routeNumber?: string;
    routeCode?: string;
    pickupTime?: string;
    createdAt: Date;
    updatedAt: Date;
}

const transportFeeSchema = new Schema<ITransportFee>({
    station: { type: String, required: true, unique: true },
    amount: { type: Number, default: 0 },
    routeNumber: { type: String },
    routeCode: { type: String },
    pickupTime: { type: String },
}, { timestamps: true });

const TransportFee = mongoose.model<ITransportFee>('TransportFee', transportFeeSchema);
export default TransportFee;
