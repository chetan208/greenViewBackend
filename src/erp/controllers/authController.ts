import { Request, Response } from 'express';
import User from '../../model/erpModels/user';
import { generateOtp, sendOtpSms } from '../services/otpService';
import { generateToken } from '../services/tokenService';

export const sendOtp = async (req: Request, res: Response): Promise<void> => {
    try {
        const { phone } = req.body;
        
        if (!phone) {
            res.status(400).json({ success: false, message: 'Phone number is required' });
            return;
        }

        const user = await User.findOne({ phone, isActive: true });
        if (!user) {
            res.status(404).json({ success: false, message: 'Not registered. Contact school.' });
            return;
        }

        const otp = generateOtp();
        const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        user.otp = otp;
        user.otpExpiry = otpExpiry;
        await user.save();

        await sendOtpSms(phone, otp);

        // Return OTP in response for testing in production
        console.log(`[OTP GENERATED] Phone: ${phone}, OTP: ${otp}`);
        res.status(200).json({ 
            success: true, 
            message: 'OTP sent successfully',
            otp: otp 
        });
    } catch (error) {
        console.error('Send OTP error:', error);
        res.status(500).json({ success: false, message: 'Failed to send OTP' });
    }
};

export const verifyOtp = async (req: Request, res: Response): Promise<void> => {
    try {
        const { phone, otp } = req.body;

        if (!phone || !otp) {
            res.status(400).json({ success: false, message: 'Phone and OTP are required' });
            return;
        }

        const user = await User.findOne({ phone, isActive: true });
        if (!user || !user.otp || !user.otpExpiry) {
            res.status(401).json({ success: false, message: 'Invalid or expired OTP' });
            return;
        }

        if (user.otp !== otp || user.otpExpiry < new Date()) {
            res.status(401).json({ success: false, message: 'Invalid or expired OTP' });
            return;
        }

        // Clear OTP
        user.otp = undefined;
        user.otpExpiry = undefined;
        await user.save();

        const token = generateToken(user);

        // Set HttpOnly cookie for web
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.status(200).json({
            success: true,
            message: 'Login successful',
            token, // For React Native
            user: {
                id: user._id,
                name: user.name,
                role: user.role,
                phone: user.phone,
                photoUrl: user.photoUrl,
                accessRole: user.teacherProfile?.accessRole
            }
        });
    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({ success: false, message: 'Failed to verify OTP' });
    }
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Not authenticated' });
            return;
        }

        const user = await User.findById(req.user.userId).select('-otp -otpExpiry');
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }

        res.status(200).json({ success: true, user });
    } catch (error) {
        console.error('Get Me error:', error);
        res.status(500).json({ success: false, message: 'Failed to get profile' });
    }
};

export const updateMe = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Not authenticated' });
            return;
        }

        const { name, photoUrl, photoPublicId, teacherProfile } = req.body;
        const updateData: any = {};
        
        if (name !== undefined) updateData.name = name;
        if (photoUrl !== undefined) updateData.photoUrl = photoUrl;
        if (photoPublicId !== undefined) updateData.photoPublicId = photoPublicId;
        
        // Prevent changing accessRole, employeeId, or isPrincipal through this route
        if (teacherProfile !== undefined) {
            updateData['teacherProfile.subject'] = teacherProfile.subject;
            updateData['teacherProfile.department'] = teacherProfile.department;
        }

        const user = await User.findByIdAndUpdate(
            req.user.userId,
            { $set: updateData },
            { new: true, runValidators: true }
        ).select('-otp -otpExpiry');

        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }

        res.status(200).json({ success: true, message: 'Profile updated successfully', user });
    } catch (error) {
        console.error('Update Me error:', error);
        res.status(500).json({ success: false, message: 'Failed to update profile' });
    }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
    try {
        res.clearCookie('token');
        res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ success: false, message: 'Failed to logout' });
    }
};
