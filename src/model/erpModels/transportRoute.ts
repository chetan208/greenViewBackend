import mongoose, { Schema, Document } from 'mongoose';

export interface ITransportRoute extends Document {
    routeName: string;
    description?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const transportRouteSchema = new Schema<ITransportRoute>({
    routeName: { type: String, required: true, unique: true },
    description: { type: String },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

const TransportRoute = mongoose.model<ITransportRoute>('TransportRoute', transportRouteSchema);
export default TransportRoute;
