import mongoose, { Schema, Document } from 'mongoose';

export interface IStudentSession extends Document {
    userId: mongoose.Types.ObjectId;
    sessionId: mongoose.Types.ObjectId;
    classId: mongoose.Types.ObjectId;
    section?: string;
    cardNo: string;
    station?: string;
    dateOfAdmission?: Date;

    discountTuition: number;
    discountBus: number;
    discountAdmission: number;
    discountAnnual: number;
    discountExam: number;
    discountComputer: number;

    createdAt: Date;
    updatedAt: Date;
}

const studentSessionSchema = new Schema<IStudentSession>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sessionId: { type: Schema.Types.ObjectId, ref: 'Session', required: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    section: String,
    cardNo: { type: String, required: true },
    station: String,
    dateOfAdmission: Date,

    discountTuition: { type: Number, default: 0 },
    discountBus: { type: Number, default: 0 },
    discountAdmission: { type: Number, default: 0 },
    discountAnnual: { type: Number, default: 0 },
    discountExam: { type: Number, default: 0 },
    discountComputer: { type: Number, default: 0 },
}, { timestamps: true });

studentSessionSchema.index({ userId: 1, sessionId: 1 }, { unique: true });
studentSessionSchema.index({ classId: 1, sessionId: 1 });
studentSessionSchema.index({ cardNo: 1, sessionId: 1 }, { unique: true });

const StudentSession = mongoose.model<IStudentSession>('StudentSession', studentSessionSchema);
export default StudentSession;
