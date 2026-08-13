import mongoose, { Document, Schema } from 'mongoose';
import { AcademicStream } from './studyMaterial';

export interface IChapterOutline {
    chapterNumber: number;
    title: string;
    description?: string;
    isActive?: boolean;
}

export interface IAcademicSubject extends Document {
    className: string;         // e.g. "Class I", "Class X", "Class XII"
    stream: AcademicStream;    // 'General' | 'Science' | 'Commerce' | 'Arts'
    subjectName: string;       // e.g. "Mathematics", "Physics", "Chemistry"
    subjectCode?: string;      // e.g. "MATH-10"
    iconName?: string;         // Icon descriptor e.g. "BookOpen", "FlaskConical"
    description?: string;
    chapters: IChapterOutline[];
    order: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const chapterOutlineSchema = new Schema<IChapterOutline>(
    {
        chapterNumber: { type: Number, required: true },
        title: { type: String, required: true, trim: true },
        description: { type: String, trim: true },
        isActive: { type: Boolean, default: true }
    },
    { _id: false }
);

const academicSubjectSchema: Schema<IAcademicSubject> = new Schema(
    {
        className: {
            type: String,
            required: [true, 'Class name is required'],
            trim: true,
            index: true
        },
        stream: {
            type: String,
            enum: ['General', 'Science', 'Commerce', 'Arts'],
            default: 'General'
        },
        subjectName: {
            type: String,
            required: [true, 'Subject name is required'],
            trim: true
        },
        subjectCode: { type: String, trim: true },
        iconName: { type: String, default: 'BookOpen' },
        description: { type: String, trim: true },
        chapters: [chapterOutlineSchema],
        order: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true }
    },
    {
        timestamps: true
    }
);

// Ensure unique subject per class & stream
academicSubjectSchema.index({ className: 1, stream: 1, subjectName: 1 }, { unique: true });

const AcademicSubject = mongoose.model<IAcademicSubject>('AcademicSubject', academicSubjectSchema);

export default AcademicSubject;
