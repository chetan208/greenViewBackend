import { Request, Response } from 'express';
import User from '../../model/erpModels/user';

export const createTeacher = async (req: Request, res: Response): Promise<void> => {
    try {
        const data = req.body;

        const existing = await User.findOne({ phone: data.phone });
        if (existing) {
            res.status(400).json({ success: false, message: 'Phone number already registered' });
            return;
        }

        const user = new User({
            phone: data.phone,
            role: 'teacher',
            name: data.name,
            email: data.email,
            photoUrl: data.photoUrl,
            photoPublicId: data.photoPublicId,
            cloudName: data.cloudName,
            teacherProfile: {
                subject: data.subject,
                qualification: data.qualification,
                department: data.department,
                bio: data.bio,
                joinDate: data.joinDate || new Date(),
                employeeId: data.employeeId,
                isPrincipal: data.isPrincipal || false,
                accessRole: data.accessRole || 'Teacher'
            }
        });

        await user.save();
        res.status(201).json({ success: true, message: 'Teacher created successfully', user });
    } catch (error: any) {
        console.error('Create teacher error:', error);
        res.status(500).json({ success: false, message: 'Failed to create teacher', error: error.message });
    }
};

export const getTeachers = async (req: Request, res: Response): Promise<void> => {
    try {
        const teachers = await User.find({ role: 'teacher' }).select('-otp -otpExpiry');
        res.status(200).json({ success: true, teachers });
    } catch (error) {
        console.error('Get teachers error:', error);
        res.status(500).json({ success: false, message: 'Failed to get teachers' });
    }
};

export const getTeacherById = async (req: Request, res: Response): Promise<void> => {
    try {
        const teacher = await User.findOne({ _id: req.params.id, role: 'teacher' }).select('-otp -otpExpiry');
        if (!teacher) {
            res.status(404).json({ success: false, message: 'Teacher not found' });
            return;
        }
        res.status(200).json({ success: true, teacher });
    } catch (error) {
        console.error('Get teacher by id error:', error);
        res.status(500).json({ success: false, message: 'Failed to get teacher' });
    }
};

export const updateTeacher = async (req: Request, res: Response): Promise<void> => {
    try {
        const data = req.body;
        const teacher = await User.findOne({ _id: req.params.id, role: 'teacher' });
        
        if (!teacher) {
            res.status(404).json({ success: false, message: 'Teacher not found' });
            return;
        }

        if (data.name) teacher.name = data.name;
        if (data.email) teacher.email = data.email;
        if (data.phone) teacher.phone = data.phone;
        if (data.photoUrl) teacher.photoUrl = data.photoUrl;
        
        if (teacher.teacherProfile) {
            if (data.subject !== undefined) teacher.teacherProfile.subject = data.subject;
            if (data.qualification !== undefined) teacher.teacherProfile.qualification = data.qualification;
            if (data.department !== undefined) teacher.teacherProfile.department = data.department;
            if (data.accessRole !== undefined) teacher.teacherProfile.accessRole = data.accessRole;
        }

        await teacher.save();
        res.status(200).json({ success: true, message: 'Teacher updated successfully', teacher });
    } catch (error) {
        console.error('Update teacher error:', error);
        res.status(500).json({ success: false, message: 'Failed to update teacher' });
    }
};

export const deleteTeacher = async (req: Request, res: Response): Promise<void> => {
    try {
        await User.findOneAndDelete({ _id: req.params.id, role: 'teacher' });
        res.status(200).json({ success: true, message: 'Teacher deleted successfully' });
    } catch (error) {
        console.error('Delete teacher error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete teacher' });
    }
};
