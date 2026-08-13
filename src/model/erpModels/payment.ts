import mongoose, { Schema, Document } from 'mongoose';

export interface IPayment extends Document {
    feeStructureId: mongoose.Types.ObjectId;
    amountPaid: number;
    paymentMode: 'CASH' | 'UPI';
    date: Date;
    receiptNo: string;
    createdAt: Date;
    updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>({
    feeStructureId: { type: Schema.Types.ObjectId, ref: 'FeeStructure', required: true, index: true },
    amountPaid: { type: Number, required: true },
    paymentMode: { type: String, enum: ['CASH', 'UPI'], required: true },
    date: { type: Date, default: Date.now },
    receiptNo: { type: String, required: true, unique: true },
}, { timestamps: true });

const Payment = mongoose.model<IPayment>('Payment', paymentSchema);
export default Payment;
