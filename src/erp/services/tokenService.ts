import jwt from 'jsonwebtoken';
import { IUser } from '../../model/erpModels/user';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface TokenPayload {
    userId: string;
    phone: string;
    role: string;
    accessRole?: string;
}

export const generateToken = (user: IUser): string => {
    const payload: TokenPayload = {
        userId: user._id.toString(),
        phone: user.phone,
        role: user.role,
        accessRole: user.teacherProfile?.accessRole
    };

    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] });
};

export const verifyToken = (token: string): TokenPayload | null => {
    try {
        return jwt.verify(token, JWT_SECRET) as TokenPayload;
    } catch (error) {
        return null;
    }
};
