import mongoose, { Schema, Document } from 'mongoose';

export interface INotice extends Document {
    title: string;
    description: string;
    documentUrl: string;
    documentPublicId: string;
    cloudName: string;
    createdAt: Date;
    updatedAt: Date;
}

const noticeSchema: Schema<INotice> = new Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
    },
    documentUrl: {
        type: String,
    },
    documentPublicId: {
        type: String,
    },
    cloudName: {
        type: String,
        required: true
    }

}, { timestamps: true });

const Notice = mongoose.model<INotice>('Notice', noticeSchema);

export default Notice;