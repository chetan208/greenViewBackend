import { Request, Response } from 'express';
import TopResult from '../../model/adminModels/topResult';

export const getTopResults = async (req: Request, res: Response): Promise<void> => {
    try {
        const { session } = req.query;
        let filter: any = {};
        if (session && session !== 'all') {
            filter = { session };
        }
        
        // Sort by percentage descending
        let results = await TopResult.find(filter).sort({ percentage: -1 });
        
        // Fallback: If specific session filter returned 0 results, fetch all toppers so the list is never empty!
        if (results.length === 0 && session && session !== 'all') {
            results = await TopResult.find({}).sort({ percentage: -1 });
        }
        
        res.status(200).json({ success: true, results });
    } catch (error) {
        console.error('Error fetching top results:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch top results' });
    }
};

import { getNextCloudinaryInstance, getCloudinaryInstanceByName } from '../../../config/cloudinary';
import fs from 'fs';

export const createTopResult = async (req: Request, res: Response): Promise<void> => {
    let uploadedCloudName: string | null = null;
    let uploadedPublicId: string | null = null;
    let usedCloudinaryInstance: any = null;

    try {
        const { name, className, marks, percentage, session } = req.body;

        if (!name || !className || !percentage || !session) {
            res.status(400).json({ success: false, message: 'Missing required fields' });
            return;
        }

        if (!req.file) {
            res.status(400).json({ success: false, message: 'Photo is required' });
            return;
        }

        const { cloudinary, cloud_name } = getNextCloudinaryInstance();
        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: 'toppers'
        });

        uploadedCloudName = cloud_name;
        uploadedPublicId = result.public_id;
        usedCloudinaryInstance = cloudinary;

        const newResult = new TopResult({
            name,
            class: className,
            marks: marks ? Number(marks) : undefined,
            percentage: Number(percentage),
            imageUrl: result.secure_url,
            imagePublicId: result.public_id,
            cloudName: cloud_name,
            session
        });
        
        await newResult.save();

        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(201).json({ success: true, result: newResult });
    } catch (error: any) {
        console.error('Error creating top result:', error);
        
        if (uploadedCloudName && uploadedPublicId && usedCloudinaryInstance) {
            try {
                await usedCloudinaryInstance.uploader.destroy(uploadedPublicId);
            } catch (cloudinaryError) {
                console.error('Error cleaning up uploaded photo:', cloudinaryError);
            }
        }

        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({ success: false, message: 'Failed to create top result', error: error.message });
    }
};

export const deleteTopResult = async (req: Request, res: Response): Promise<void> => {
    try {
        const topper = await TopResult.findById(req.params.id);
        if (!topper) {
            res.status(404).json({ success: false, message: 'Top result not found' });
            return;
        }

        const instance = getCloudinaryInstanceByName(topper.cloudName);
        if (instance) {
            const { cloudinary } = instance;
            try {
                await cloudinary.uploader.destroy(topper.imagePublicId);
            } catch (err) {
                console.error('Failed to delete photo from Cloudinary', err);
            }
        }

        await TopResult.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: 'Top result deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting top result:', error);
        res.status(500).json({ success: false, message: 'Failed to delete top result', error: error.message });
    }
};
