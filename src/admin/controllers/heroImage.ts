import { Request, Response } from 'express';
import HeroImage from '../../model/adminModels/heroImage';
import { getNextCloudinaryInstance, getCloudinaryInstanceByName } from '../../../config/cloudinary';
import fs from 'fs';

export const getHeroImages = async (req: Request, res: Response): Promise<void> => {
    try {
        const images = await HeroImage.find({ isActive: true }).sort({ order: 1 });
        res.status(200).json({ success: true, images });
    } catch (error) {
        console.error('Error fetching hero images:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch hero images' });
    }
};

export const createHeroImage = async (req: Request, res: Response): Promise<void> => {
    let uploadedCloudName: string | null = null;
    let uploadedPublicId: string | null = null;
    let usedCloudinaryInstance: any = null;

    try {
        if (!req.file) {
            res.status(400).json({ success: false, message: 'Image is required' });
            return;
        }

        const { cloudinary, cloud_name } = getNextCloudinaryInstance();
        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: 'hero_carousel'
        });

        uploadedCloudName = cloud_name;
        uploadedPublicId = result.public_id;
        usedCloudinaryInstance = cloudinary;

        const maxOrderImage = await HeroImage.findOne().sort('-order');
        const nextOrder = maxOrderImage ? maxOrderImage.order + 1 : 0;

        const newHeroImage = new HeroImage({
            imageUrl: result.secure_url,
            imagePublicId: result.public_id,
            cloudName: cloud_name,
            order: nextOrder,
            isActive: true
        });
        
        await newHeroImage.save();

        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(201).json({ success: true, image: newHeroImage });
    } catch (error: any) {
        console.error('Error uploading hero image:', error);
        if (uploadedCloudName && uploadedPublicId && usedCloudinaryInstance) {
            try {
                await usedCloudinaryInstance.uploader.destroy(uploadedPublicId);
            } catch (err) {
                console.error('Failed to rollback cloudinary upload', err);
            }
        }
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ success: false, message: 'Failed to upload hero image', error: error.message });
    }
};

export const deleteHeroImage = async (req: Request, res: Response): Promise<void> => {
    try {
        const image = await HeroImage.findById(req.params.id);
        if (!image) {
            res.status(404).json({ success: false, message: 'Hero image not found' });
            return;
        }

        const instance = getCloudinaryInstanceByName(image.cloudName);
        if (instance) {
            const { cloudinary } = instance;
            try {
                await cloudinary.uploader.destroy(image.imagePublicId);
            } catch (err) {
                console.error('Failed to delete hero image from Cloudinary', err);
            }
        }

        await HeroImage.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: 'Hero image deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting hero image:', error);
        res.status(500).json({ success: false, message: 'Failed to delete hero image', error: error.message });
    }
};

export const reorderHeroImages = async (req: Request, res: Response): Promise<void> => {
    try {
        const { updates } = req.body; // Expects [{ id, order }]
        if (!Array.isArray(updates)) {
            res.status(400).json({ success: false, message: 'Updates must be an array' });
            return;
        }

        const bulkOps = updates.map((update: any) => ({
            updateOne: {
                filter: { _id: update.id },
                update: { order: update.order }
            }
        }));

        await HeroImage.bulkWrite(bulkOps);

        res.status(200).json({ success: true, message: 'Hero images reordered successfully' });
    } catch (error: any) {
        console.error('Error reordering hero images:', error);
        res.status(500).json({ success: false, message: 'Failed to reorder hero images', error: error.message });
    }
};
