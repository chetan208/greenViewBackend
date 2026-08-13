import mongoose, { Document, Schema } from 'mongoose';

export interface IGallery extends Document {
    title?: string;
    mediaType: 'image' | 'video';
    url: string;
    publicId: string;
    folder: mongoose.Types.ObjectId;
    cloudName: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface IFolder extends Document {
    name: string;
    media: mongoose.Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}

const folderSchema: Schema<IFolder> = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    media: [{
        type: Schema.Types.ObjectId,
        ref: 'Gallery'
    }]
}, { timestamps: true });

const gallerySchema: Schema<IGallery> = new Schema({
    title: {
        type: String,
        trim: true
    },
    mediaType: {
        type: String,
        enum: ['image', 'video'],
        required: true
    },
    url: {
        type: String,
        required: true
    },
    publicId: {
        type: String,
        required: true
    },
    folder: {
        type: Schema.Types.ObjectId,
        ref: 'Folder',
        required: true,
        index: true
    },
    cloudName: {
        type: String,
        required: true
    }
}, { timestamps: true });

const Gallery = mongoose.model<IGallery>('Gallery', gallerySchema);
const Folder = mongoose.model<IFolder>('Folder', folderSchema);

export { Folder, Gallery };


