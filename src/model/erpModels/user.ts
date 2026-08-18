import mongoose, { Schema, Document } from 'mongoose';

export interface IPreviousExam {
    examName?: string;
    passingYear?: string;
    school?: string;
    boardName?: string;
    rollNumber?: string;
    result?: string;
    maxMarks?: number;
    marksObtained?: number;
    percentage?: number;
}

export interface IStudentProfile {
    fatherName?: string;
    fatherMobile?: string;
    motherName?: string;
    motherMobile?: string;
    guardianName?: string;
    guardianMobile?: string;
    dob?: Date;
    sex?: string;
    religion?: string;
    socialCategory?: string;
    motherTongue?: string;
    aadhaarNumber?: string;
    
    address?: string;
    village?: string;
    postOffice?: string;
    tehsil?: string;
    district?: string;
    state?: string;
    pinCode?: string;

    prevSchoolName?: string;
    prevSchoolMedium?: string;
    stream?: string;
    subjects?: string[];
    previousExams?: IPreviousExam[];

    bankAccountNo?: string;
    bankName?: string;
    bankBranch?: string;
    ifscCode?: string;

    bplStatus?: boolean;
    fatherOccupation?: string;
    annualIncome?: string;
    udisePenNo?: string;
    panNumber?: string;
    hobbies?: string;
    interestInGames?: string;
}

export interface IStaffProfile {
    isTeacher?: boolean;
    subject?: string;
    qualification?: string;
    department?: string;
    bio?: string;
    joinDate?: Date;
    employeeId?: string;
    isPrincipal?: boolean;
    post?: string;
}

export interface IUser extends Document {
    phone: string;
    role: 'student' | 'user';
    accessLevel?: 'staff' | 'admin' | 'superadmin' | 'student';
    otp?: string;
    otpExpiry?: Date;
    isActive: boolean;

    name: string;
    email?: string;
    photoUrl?: string;
    photoPublicId?: string;
    cloudName?: string;

    studentProfile?: IStudentProfile;
    staffProfile?: IStaffProfile;

    createdAt: Date;
    updatedAt: Date;
}

const previousExamSchema = new Schema<IPreviousExam>({
    examName: String,
    passingYear: String,
    school: String,
    boardName: String,
    rollNumber: String,
    result: String,
    maxMarks: Number,
    marksObtained: Number,
    percentage: Number
});

const studentProfileSchema = new Schema<IStudentProfile>({
    fatherName: String,
    fatherMobile: String,
    motherName: String,
    motherMobile: String,
    guardianName: String,
    guardianMobile: String,
    dob: Date,
    sex: String,
    religion: String,
    socialCategory: String,
    motherTongue: String,
    aadhaarNumber: String,
    
    address: String,
    village: String,
    postOffice: String,
    tehsil: String,
    district: String,
    state: { type: String, default: 'Himachal Pradesh' },
    pinCode: String,

    prevSchoolName: String,
    prevSchoolMedium: String,
    stream: String,
    subjects: [String],
    previousExams: [previousExamSchema],

    bankAccountNo: String,
    bankName: String,
    bankBranch: String,
    ifscCode: String,

    bplStatus: Boolean,
    fatherOccupation: String,
    annualIncome: String,
    udisePenNo: String,
    panNumber: String,
    hobbies: String,
    interestInGames: String
});

const staffProfileSchema = new Schema<IStaffProfile>({
    isTeacher: { type: Boolean, default: false },
    subject: String,
    qualification: String,
    department: String,
    bio: String,
    joinDate: Date,
    employeeId: String,
    isPrincipal: { type: Boolean, default: false },
    post: String

});

const userSchema = new Schema<IUser>({
    phone: { type: String, required: true, unique: true, index: true },
    role: { type: String, enum: ['student', 'user'], required: true, index: true },
    accessLevel: { type: String, enum: ['staff', 'admin', 'superadmin', 'student'], default: 'student' },
    otp: String,
    otpExpiry: Date,
    isActive: { type: Boolean, default: true },

    name: { type: String, required: true },
    email: String,
    photoUrl: String,
    photoPublicId: String,
    cloudName: String,

    studentProfile: studentProfileSchema,
    staffProfile: staffProfileSchema,
}, { timestamps: true });

userSchema.index({ "accessLevel": 1 });

const User = mongoose.model<IUser>('User', userSchema);
export default User;
