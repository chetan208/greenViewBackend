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

export interface IAdmissionApplication extends Document {
    applicationId: string;
    applicationType: 'primary' | 'senior';
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    appliedClass: string;
    sessionYear: string;

    photoUrl?: string;
    photoPublicId?: string;
    cloudName?: string;

    studentName: string;
    studentNameHindi?: string;
    dateOfBirth?: Date;
    sex?: string;
    religion?: string;
    socialCategory?: string;
    motherTongue?: string;
    aadhaarNumber?: string;
    panNumber?: string;
    bplStatus?: boolean;

    fatherName: string;
    fatherMobile: string;
    fatherOccupation?: string;
    motherName?: string;
    motherMobile?: string;
    guardianName?: string;
    guardianMobile?: string;
    annualIncome?: string;

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
    isProvisional?: boolean;
    selectedSubjects?: string[];

    previousExams?: IPreviousExam[];

    bankAccountNo?: string;
    bankName?: string;
    bankBranch?: string;
    ifscCode?: string;

    hobbies?: string;
    interestInGames?: string;
    extracurricular?: string;

    approvedBy?: mongoose.Types.ObjectId;
    approvedAt?: Date;
    rejectionReason?: string;
    createdUserId?: mongoose.Types.ObjectId;

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

const admissionApplicationSchema = new Schema<IAdmissionApplication>({
    applicationId: { type: String, required: true, unique: true, index: true },
    applicationType: { type: String, enum: ['primary', 'senior'], required: true },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING', index: true },
    appliedClass: { type: String, required: true },
    sessionYear: { type: String, required: true },

    photoUrl: String,
    photoPublicId: String,
    cloudName: String,

    studentName: { type: String, required: true },
    studentNameHindi: String,
    dateOfBirth: Date,
    sex: String,
    religion: String,
    socialCategory: String,
    motherTongue: String,
    aadhaarNumber: String,
    panNumber: String,
    bplStatus: Boolean,

    fatherName: { type: String, required: true },
    fatherMobile: { type: String, required: true, index: true },
    fatherOccupation: String,
    motherName: String,
    motherMobile: String,
    guardianName: String,
    guardianMobile: String,
    annualIncome: String,

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
    isProvisional: Boolean,
    selectedSubjects: [String],

    previousExams: [previousExamSchema],

    bankAccountNo: String,
    bankName: String,
    bankBranch: String,
    ifscCode: String,

    hobbies: String,
    interestInGames: String,
    extracurricular: String,

    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    rejectionReason: String,
    createdUserId: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

admissionApplicationSchema.index({ appliedClass: 1, sessionYear: 1 });

const AdmissionApplication = mongoose.model<IAdmissionApplication>('AdmissionApplication', admissionApplicationSchema);
export default AdmissionApplication;
