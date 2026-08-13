import mongoose , { Document, Schema } from 'mongoose';

export interface ITopResult extends Document {
    name: string;
    class: string;
    marks: number;
    percentage: number;
    imageUrl: string;
    imagePublicId: string;
    cloudName: string;
    session: string;
    createdAt: Date;
    updatedAt: Date;
}

const topResultSchema : Schema<ITopResult> = new Schema({
    name:{
        type: String,
        required: true
    },
    class: {
        type: String,
        required: true
    },
    marks: {
        type: Number,
        required: true
    },
    percentage: {
        type: Number,
        required: true
    },
    imageUrl: {
        type: String,
        required: true
    },
    imagePublicId: {
        type: String,
        required: true
    },
    cloudName: {
        type: String,
        required: true
    },
    session: {
        type: String,
        required: true
    }
}, { timestamps: true });

const TopResult = mongoose.model<ITopResult>('TopResult', topResultSchema);

export default TopResult;