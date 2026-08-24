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

        let parsedCategories: string[] = [];
        if (data.teacherCategory) {
            try {
                parsedCategories = typeof data.teacherCategory === 'string'
                    ? JSON.parse(data.teacherCategory)
                    : data.teacherCategory;
            } catch (e) {
                parsedCategories = typeof data.teacherCategory === 'string'
                    ? data.teacherCategory.split(',').map((c: string) => c.trim())
                    : [data.teacherCategory];
            }
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
                post: data.post,
                teacherCategory: parsedCategories,
                experience: data.experience
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
        const { search, department, category, isTeacher } = req.query;
        const filter: any = { role: 'user' };

        if (isTeacher === 'true') {
            filter['staffProfile.isTeacher'] = true;
        }

        if (department && department !== 'All') {
            filter['staffProfile.department'] = department;
        }
        if (category) {
            filter['staffProfile.teacherCategory'] = category;
        }
        if (search) {
            filter['$or'] = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
                { 'staffProfile.post': { $regex: search, $options: 'i' } },
                { 'staffProfile.subject': { $regex: search, $options: 'i' } }
            ];
        }

        const limitStr = req.query.limit as string;
        const pageStr = req.query.page as string;

        let query = User.find(filter).select('-otp -otpExpiry').sort({ createdAt: 1 });

        if (limitStr && limitStr !== '0') {
            const limit = parseInt(limitStr) || 12;
            const page = parseInt(pageStr) || 1;
            const skip = (page - 1) * limit;
            query = query.skip(skip).limit(limit);
        }

        const teachers = await query;
        const total = await User.countDocuments(filter);

        res.status(200).json({ success: true, teachers, total });
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

        let parsedCategories: string[] | undefined = undefined;
        if (data.teacherCategory !== undefined) {
            try {
                parsedCategories = typeof data.teacherCategory === 'string'
                    ? JSON.parse(data.teacherCategory)
                    : data.teacherCategory;
            } catch (e) {
                parsedCategories = typeof data.teacherCategory === 'string'
                    ? data.teacherCategory.split(',').map((c: string) => c.trim())
                    : [data.teacherCategory];
            }
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
            if (parsedCategories !== undefined) teacher.staffProfile.teacherCategory = parsedCategories;
            if (data.experience !== undefined) teacher.staffProfile.experience = data.experience;
        } else {
            // initialize if missing
            teacher.staffProfile = {
                isTeacher: data.isTeacher === 'true' || data.isTeacher === true,
                subject: data.subject,
                qualification: data.qualification,
                department: data.department,
                post: data.post,
                teacherCategory: parsedCategories || [],
                experience: data.experience
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
