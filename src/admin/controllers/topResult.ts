import { Request, Response } from 'express';
import TopResult from '../../model/adminModels/topResult';

export const getTopResults = async (req: Request, res: Response): Promise<void> => {
    try {
        const { session } = req.query;
        let filter = {};
        if (session) {
            filter = { session };
        }
        
        // Sort by percentage descending
        const results = await TopResult.find(filter).sort({ percentage: -1 });
        
        res.status(200).json({ success: true, results });
    } catch (error) {
        console.error('Error fetching top results:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch top results' });
    }
};

export const createTopResult = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, className, marks, percentage, imageUrl, imagePublicId, cloudName, session } = req.body;
        
        const newResult = new TopResult({
            name,
            class: className,
            marks,
            percentage,
            imageUrl: imageUrl || '',
            imagePublicId: imagePublicId || '',
            cloudName: cloudName || '',
            session
        });
        
        await newResult.save();
        res.status(201).json({ success: true, result: newResult });
    } catch (error) {
        console.error('Error creating top result:', error);
        res.status(500).json({ success: false, message: 'Failed to create top result' });
    }
};
