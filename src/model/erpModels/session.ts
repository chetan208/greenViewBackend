import mongoose, { Schema, Document } from 'mongoose';

export interface ISession extends Document {
    year: string;
    isActive: boolean;
    admissionsOpen: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const sessionSchema = new Schema<ISession>({
    year: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: false },
    admissionsOpen: { type: Boolean, default: false },
}, { timestamps: true });

const Session = mongoose.model<ISession>('Session', sessionSchema);
export default Session;
