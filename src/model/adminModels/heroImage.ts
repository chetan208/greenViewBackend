import mongoose, { Document, Schema } from 'mongoose';

export interface IHeroImage extends Document {
    imageUrl: string;
    imagePublicId: string;
    cloudName: string;
    order: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const heroImageSchema: Schema<IHeroImage> = new Schema({
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
    order: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

const HeroImage = mongoose.model<IHeroImage>('HeroImage', heroImageSchema);

export default HeroImage;
