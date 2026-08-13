import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../services/tokenService';
import User from '../../model/erpModels/user';

declare global {
    namespace Express {
        interface Request {
            user?: TokenPayload;
        }
    }
}

export const isAuthenticated = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        let token = '';

        // 1. Check Authorization header (Bearer token)
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        }

        // 2. Fallback to cookies
        if (!token && req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }

        if (!token) {
            res.status(401).json({ success: false, message: 'Authentication required' });
            return;
        }

        const decoded = verifyToken(token);
        if (!decoded) {
            res.status(401).json({ success: false, message: 'Invalid or expired token' });
            return;
        }

        // Optional: Verify user still exists in DB
        const user = await User.findById(decoded.userId).select('isActive');
        if (!user || !user.isActive) {
            res.status(401).json({ success: false, message: 'User not found or inactive' });
            return;
        }

        req.user = decoded;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({ success: false, message: 'Server error in authentication' });
    }
};

export const isAdmin = (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
    }
    
    // Both Admin and Owner have admin privileges
    if (req.user.accessRole === 'Admin' || req.user.accessRole === 'Owner') {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Access denied: Requires Admin role' });
    }
};

export const isOwner = (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
    }

    if (req.user.accessRole === 'Owner') {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Access denied: Requires Owner role' });
    }
};
