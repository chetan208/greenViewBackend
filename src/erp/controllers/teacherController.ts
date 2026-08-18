import { Request, Response } from 'express';
import User from '../../model/erpModels/user';
import getStorageService from '../../services/storage';

export const createTeacher = async (req: Request, res: Response): Promise<void> => {
    try {
        const data = req.body;

        const existing = await User.findOne({ phone: data.phone });
        if (existing) {
            res.status(400).json({ success: false, message: 'Phone number already registered' });
            return;
        }

        let photoUrl = data.photoUrl;
        let photoPublicId = data.photoPublicId;

        if (req.file) {
            const storageService = getStorageService();
            const uploadResult = await storageService.uploadFile(req.file.path, { folder: 'staff-profiles' });
            photoUrl = uploadResult.url;
            photoPublicId = uploadResult.publicId;
        }

        const user = new User({
            phone: data.phone,
            role: 'user',
            accessLevel: data.accessLevel || 'staff',
            name: data.name,
            email: data.email,
            photoUrl: photoUrl,
            photoPublicId: photoPublicId,
            cloudName: data.cloudName,
            staffProfile: {
                isTeacher: data.isTeacher === 'true' || data.isTeacher === true,
                subject: data.subject,
                qualification: data.qualification,
                department: data.department,
                bio: data.bio,
                joinDate: data.joinDate || new Date(),
                employeeId: data.employeeId,
                isPrincipal: data.isPrincipal === 'true' || data.isPrincipal === true,
                post: data.post
            }
        });

        await user.save();
        res.status(201).json({ success: true, message: 'Staff created successfully', user });
    } catch (error: any) {
        console.error('Create staff error:', error);
        res.status(500).json({ success: false, message: 'Failed to create staff', error: error.message });
    }
};

export const getTeachers = async (req: Request, res: Response): Promise<void> => {
    try {
        const teachers = await User.find({ role: 'user' }).select('-otp -otpExpiry');
        res.status(200).json({ success: true, teachers });
    } catch (error) {
        console.error('Get staff error:', error);
        res.status(500).json({ success: false, message: 'Failed to get staff' });
    }
};

export const getTeacherById = async (req: Request, res: Response): Promise<void> => {
    try {
        const teacher = await User.findOne({ _id: req.params.id, role: 'user' }).select('-otp -otpExpiry');
        if (!teacher) {
            res.status(404).json({ success: false, message: 'Staff not found' });
            return;
        }
        res.status(200).json({ success: true, teacher });
    } catch (error) {
        console.error('Get staff by id error:', error);
        res.status(500).json({ success: false, message: 'Failed to get staff' });
    }
};

export const updateTeacher = async (req: Request, res: Response): Promise<void> => {
    try {
        const data = req.body;
        const teacher = await User.findOne({ _id: req.params.id, role: 'user' });
        
        if (!teacher) {
            res.status(404).json({ success: false, message: 'Staff not found' });
            return;
        }

        if (req.file) {
            const storageService = getStorageService();
            if (teacher.photoPublicId) {
                try {
                    await storageService.deleteFile(teacher.photoPublicId);
                } catch (e) {
                    console.error('Failed to delete old photo:', e);
                }
            }
            const uploadResult = await storageService.uploadFile(req.file.path, { folder: 'staff-profiles' });
            teacher.photoUrl = uploadResult.url;
            teacher.photoPublicId = uploadResult.publicId;
        }

        if (data.name) teacher.name = data.name;
        if (data.email) teacher.email = data.email;
        if (data.phone) teacher.phone = data.phone;
        if (data.accessLevel) teacher.accessLevel = data.accessLevel;
        
        if (teacher.staffProfile) {
            if (data.isTeacher !== undefined) teacher.staffProfile.isTeacher = data.isTeacher === 'true' || data.isTeacher === true;
            if (data.subject !== undefined) teacher.staffProfile.subject = data.subject;
            if (data.qualification !== undefined) teacher.staffProfile.qualification = data.qualification;
            if (data.department !== undefined) teacher.staffProfile.department = data.department;
            if (data.post !== undefined) teacher.staffProfile.post = data.post;
        } else {
            // initialize if missing
            teacher.staffProfile = {
                isTeacher: data.isTeacher === 'true' || data.isTeacher === true,
                subject: data.subject,
                qualification: data.qualification,
                department: data.department,
                post: data.post
            };
        }

        await teacher.save();
        res.status(200).json({ success: true, message: 'Staff updated successfully', teacher });
    } catch (error) {
        console.error('Update staff error:', error);
        res.status(500).json({ success: false, message: 'Failed to update staff' });
    }
};

export const deleteTeacher = async (req: Request, res: Response): Promise<void> => {
    try {
        const teacher = await User.findOne({ _id: req.params.id, role: 'user' });
        if (!teacher) {
            res.status(404).json({ success: false, message: 'Staff not found' });
            return;
        }

        if (teacher.photoPublicId) {
            try {
                const storageService = getStorageService();
                await storageService.deleteFile(teacher.photoPublicId);
            } catch (e) {
                console.error('Failed to delete staff photo from cloud:', e);
            }
        }

        await User.findOneAndDelete({ _id: req.params.id, role: 'user' });
        res.status(200).json({ success: true, message: 'Staff deleted successfully' });
    } catch (error) {
        console.error('Delete staff error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete staff' });
    }
};
