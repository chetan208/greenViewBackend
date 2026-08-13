import mongoose, { Document, Schema } from 'mongoose';

export type StudyMaterialType = 'notes' | 'lectures' | 'papers';
export type AcademicStream = 'General' | 'Science' | 'Commerce' | 'Arts';

export interface IStudyMaterial extends Document {
    className: string;           // e.g. "Class I", "Class X", "Class XII"
    stream: AcademicStream;      // 'General' | 'Science' | 'Commerce' | 'Arts'
    subjectName: string;         // e.g. "Mathematics", "Physics", "English"
    chapterNumber: number;       // e.g. 1, 2, 3
    chapterName: string;         // e.g. "Chapter 1: Real Numbers"
    title: string;               // e.g. "Complete Formula Sheet & Notes"
    description?: string;        // Optional summary / topics covered
    type: StudyMaterialType;     // 'notes' | 'lectures' | 'papers'

    // PDF Storage Details (For 'notes' and 'papers')
    pdfUrl?: string;             // Secure Cloudinary / S3 URL
    pdfPublicId?: string;        // Storage public ID for cleanup
    cloudProvider?: string;      // e.g. 'cloudinary', 's3'
    cloudName?: string;          // Specific cloud instance name
    fileSizeBytes?: number;      // Exact size in bytes
    formattedSize?: string;      // Human readable e.g. "2.4 MB"

    // Video Details (For 'lectures' - YouTube)
    youtubeUrl?: string;         // Full YouTube URL
    youtubeVideoId?: string;     // Extracted 11-char ID e.g. "dQw4w9WgXcQ"
    videoTitle?: string;         // Title of lecture video
    thumbnailUrl?: string;       // HQ YouTube Thumbnail
    duration?: string;           // e.g. "32:15"

    // Question Paper Details (For 'papers')
    paperYear?: string;          // e.g. "2024", "2023-24"
    examType?: string;           // "Annual", "Half-Yearly", "Unit Test", "Sample Paper", "Pre-Board"
    totalMarks?: number;         // e.g. 80, 100
    hasSolution?: boolean;       // True if solution PDF is attached
    solutionPdfUrl?: string;     // Solution PDF URL
    solutionPublicId?: string;   // Solution storage ID

    // Metadata & Stats
    order: number;               // Custom ordering within chapter (default 0)
    downloadsCount: number;      // Analytics counter
    viewsCount: number;          // Analytics counter
    isPublished: boolean;        // Draft / Published flag
    session: string;             // Academic Session e.g. "2025-2026"
    uploadedBy?: string;         // Admin or teacher reference
    createdAt: Date;
    updatedAt: Date;
}

const studyMaterialSchema: Schema<IStudyMaterial> = new Schema(
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
            trim: true,
            index: true
        },
        chapterNumber: {
            type: Number,
            required: [true, 'Chapter number is required'],
            default: 1
        },
        chapterName: {
            type: String,
            required: [true, 'Chapter name is required'],
            trim: true
        },
        title: {
            type: String,
            required: [true, 'Material title is required'],
            trim: true
        },
        description: {
            type: String,
            trim: true
        },
        type: {
            type: String,
            enum: {
                values: ['notes', 'lectures', 'papers'],
                message: '{VALUE} is not a supported material type. Must be notes, lectures, or papers.'
            },
            required: [true, 'Material type is required'],
            index: true
        },

        // PDF info
        pdfUrl: { type: String, trim: true },
        pdfPublicId: { type: String, trim: true },
        cloudProvider: { type: String, default: 'cloudinary' },
        cloudName: { type: String, trim: true },
        fileSizeBytes: { type: Number, default: 0 },
        formattedSize: { type: String, default: 'PDF' },

        // Video info (YouTube)
        youtubeUrl: { type: String, trim: true },
        youtubeVideoId: { type: String, trim: true },
        videoTitle: { type: String, trim: true },
        thumbnailUrl: { type: String, trim: true },
        duration: { type: String, trim: true },

        // Paper info
        paperYear: { type: String, trim: true },
        examType: { type: String, trim: true, default: 'Sample Paper' },
        totalMarks: { type: Number },
        hasSolution: { type: Boolean, default: false },
        solutionPdfUrl: { type: String, trim: true },
        solutionPublicId: { type: String, trim: true },

        // Metadata
        order: { type: Number, default: 0 },
        downloadsCount: { type: Number, default: 0 },
        viewsCount: { type: Number, default: 0 },
        isPublished: { type: Boolean, default: true, index: true },
        session: { type: String, default: '2025-2026', trim: true },
        uploadedBy: { type: String, default: 'Admin' }
    },
    {
        timestamps: true
    }
);

// Compound Index 1: High-speed queries for Frontend (Class + Subject + Type + Status)
studyMaterialSchema.index(
    { className: 1, subjectName: 1, type: 1, isPublished: 1 },
    { name: 'idx_class_subject_type_published' }
);

// Compound Index 2: Chapter-based ordering
studyMaterialSchema.index(
    { className: 1, subjectName: 1, chapterNumber: 1, order: 1 },
    { name: 'idx_class_subject_chapter_order' }
);

// Compound Index 3: Search text index for instant material searching
studyMaterialSchema.index(
    { title: 'text', chapterName: 'text', subjectName: 'text', description: 'text' },
    { name: 'idx_text_search' }
);

const StudyMaterial = mongoose.model<IStudyMaterial>('StudyMaterial', studyMaterialSchema);

export default StudyMaterial;
