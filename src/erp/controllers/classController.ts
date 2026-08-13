import { Request, Response } from 'express';
import Class from '../../model/erpModels/class';
import ClassMonthlyFee from '../../model/erpModels/classMonthlyFee';

export const getClasses = async (req: Request, res: Response): Promise<void> => {
    try {
        const classes = await Class.find().sort({ createdAt: 1 });
        res.status(200).json({ success: true, classes });
    } catch (error) {
        console.error('Get classes error:', error);
        res.status(500).json({ success: false, message: 'Failed to get classes' });
    }
};

export const createClass = async (req: Request, res: Response): Promise<void> => {
    try {
        const { className, sections } = req.body;
        if (!className) {
            res.status(400).json({ success: false, message: 'Class name is required' });
            return;
        }

        const newClass = new Class({
            className,
            sections: sections || [],
        });

        await newClass.save();
        res.status(201).json({ success: true, message: 'Class created', class: newClass });
    } catch (error: any) {
        console.error('Create class error:', error);
        if (error.code === 11000) {
            res.status(400).json({ success: false, message: 'Class name already exists' });
        } else {
            res.status(500).json({ success: false, message: 'Failed to create class' });
        }
    }
};

export const updateClass = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { className, sections } = req.body;
        
        const updated = await Class.findByIdAndUpdate(
            id,
            { $set: { className, sections } },
            { new: true, runValidators: true }
        );

        if (!updated) {
            res.status(404).json({ success: false, message: 'Class not found' });
            return;
        }

        res.status(200).json({ success: true, message: 'Class updated', class: updated });
    } catch (error) {
        console.error('Update class error:', error);
        res.status(500).json({ success: false, message: 'Failed to update class' });
    }
};

export const updateClassDefaults = async (req: Request, res: Response): Promise<void> => {
    try {
        const { className, ...fees } = req.body;
        
        if (!className) {
            res.status(400).json({ success: false, message: 'Class name is required' });
            return;
        }

        const updated = await Class.findOneAndUpdate(
            { className },
            { $set: fees },
            { new: true, upsert: true }
        );

        res.status(200).json({ success: true, message: 'Class defaults updated', class: updated });
    } catch (error) {
        console.error('Update class defaults error:', error);
        res.status(500).json({ success: false, message: 'Failed to update class defaults' });
    }
};

export const getMonthlyOverrides = async (req: Request, res: Response): Promise<void> => {
    try {
        const { className } = req.query;
        const filter = className ? { className: className as string } : {};
        
        const overrides = await ClassMonthlyFee.find(filter);
        res.status(200).json({ success: true, overrides });
    } catch (error) {
        console.error('Get monthly overrides error:', error);
        res.status(500).json({ success: false, message: 'Failed to get overrides' });
    }
};

export const updateMonthlyOverride = async (req: Request, res: Response): Promise<void> => {
    try {
        const { className, monthName, ...fees } = req.body;
        
        if (!className || !monthName) {
            res.status(400).json({ success: false, message: 'Class name and month name required' });
            return;
        }

        const updated = await ClassMonthlyFee.findOneAndUpdate(
            { className, monthName },
            { $set: fees },
            { new: true, upsert: true }
        );

        res.status(200).json({ success: true, message: 'Monthly override updated', override: updated });
    } catch (error) {
        console.error('Update monthly override error:', error);
        res.status(500).json({ success: false, message: 'Failed to update override' });
    }
};
