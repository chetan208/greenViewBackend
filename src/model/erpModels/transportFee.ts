import mongoose, { Schema, Document } from 'mongoose';

export interface ITransportFee extends Document {
    station: string;
    amount: number;
    routeId?: mongoose.Types.ObjectId;
    routeNumber?: string;
    routeCode?: string;
    pickupTime?: string;
    order?: number;
    createdAt: Date;
    updatedAt: Date;
}

const transportFeeSchema = new Schema<ITransportFee>({
    station: { type: String, required: true, unique: true },
    amount: { type: Number, default: 0 },
    routeId: { type: Schema.Types.ObjectId, ref: 'TransportRoute' },
    routeNumber: { type: String },
    routeCode: { type: String },
    pickupTime: { type: String },
    order: { type: Number, default: 0 },
}, { timestamps: true });

const TransportFee = mongoose.model<ITransportFee>('TransportFee', transportFeeSchema);
export default TransportFee;
