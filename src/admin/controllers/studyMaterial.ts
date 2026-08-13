import { Request, Response } from 'express';
import StudyMaterial, { IStudyMaterial, StudyMaterialType } from '@/model/adminModels/studyMaterial';
import AcademicSubject from '@/model/adminModels/academicSubject';
import { getStorageService } from '@/services/storage';

/**
 * Utility: Extract 11-character YouTube video ID from various YouTube URL formats
 */
export const extractYouTubeId = (url?: string): string | null => {
    if (!url) return null;
    const cleanUrl = url.trim();
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = cleanUrl.match(regExp);
    if (match && match[2].length === 11) {
        return match[2];
    }
    // Check if it's already an 11-char ID
    if (/^[a-zA-Z0-9_-]{11}$/.test(cleanUrl)) {
        return cleanUrl;
    }
    return null;
};

/**
 * GET /api/study-material or /api/admin/study-material
 * Query parameters:
 *  - className (e.g. "Class X")
 *  - subjectName (e.g. "Mathematics")
 *  - type ("notes" | "lectures" | "papers")
 *  - chapterNumber
 *  - search (text query)
 *  - isPublished (admin only)
 */
export const getStudyMaterials = async (req: Request, res: Response) => {
    try {
        const {
            className,
            subjectName,
            type,
            chapterNumber,
            search,
            isPublished
        } = req.query;

        const filter: any = {};

        if (className) filter.className = className;
        if (subjectName) filter.subjectName = subjectName;
        if (type) filter.type = type;
        if (chapterNumber) filter.chapterNumber = Number(chapterNumber);

        // Filter published only for public queries unless explicitly requested by admin
        if (isPublished !== undefined) {
            filter.isPublished = isPublished === 'true';
        } else if (!req.baseUrl.includes('/admin')) {
            filter.isPublished = true;
        }

        let query = StudyMaterial.find(filter);

        // Full text search if search parameter is present
        if (search && typeof search === 'string' && search.trim()) {
            query = StudyMaterial.find({
                ...filter,
                $text: { $search: search.trim() }
            });
        }

        const materials = await query
            .sort({ chapterNumber: 1, order: 1, createdAt: -1 })
            .lean();

        res.status(200).json({
            success: true,
            count: materials.length,
            data: materials
        });
    } catch (error: any) {
        console.error('[StudyMaterialController] Error in getStudyMaterials:', error);
        res.status(500).json({ success: false, message: 'Error fetching study materials', error: error.message });
    }
};

/**
 * GET /api/study-material/structure
 * Returns dynamic tree of Classes -> Subjects -> Chapters with real material counts
 */
export const getAcademicStructure = async (req: Request, res: Response) => {
    try {
        const standardClasses = [
            'Class I', 'Class II', 'Class III', 'Class IV', 'Class V',
            'Class VI', 'Class VII', 'Class VIII', 'Class IX', 'Class X',
            'Class XI', 'Class XII'
        ];

        // Aggregate material counts grouped by class, subject, and type
        const aggregation = await StudyMaterial.aggregate([
            { $match: { isPublished: true } },
            {
                $group: {
                    _id: {
                        className: '$className',
                        subjectName: '$subjectName',
                        chapterNumber: '$chapterNumber',
                        chapterName: '$chapterName',
                        type: '$type'
                    },
                    count: { $sum: 1 }
                }
            }
        ]);

        // Also fetch any custom subject definitions from AcademicSubject
        const customSubjects = await AcademicSubject.find({ isActive: true }).lean();

        res.status(200).json({
            success: true,
            classes: standardClasses,
            materialsSummary: aggregation,
            subjectsCatalog: customSubjects
        });
    } catch (error: any) {
        console.error('[StudyMaterialController] Error in getAcademicStructure:', error);
        res.status(500).json({ success: false, message: 'Error fetching academic structure', error: error.message });
    }
};

/**
 * GET /api/study-material/:id
 */
export const getStudyMaterialById = async (req: Request, res: Response) => {
    try {
        const material = await StudyMaterial.findById(req.params.id);
        if (!material) {
            return res.status(404).json({ success: false, message: 'Study material not found' });
        }
        res.status(200).json({ success: true, data: material });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Error fetching study material', error: error.message });
    }
};

/**
 * POST /api/admin/study-material
 * Handles creation of notes (PDF), lectures (YouTube), and papers (PDF)
 */
export const createStudyMaterial = async (req: Request, res: Response) => {
    let uploadedPublicId: string | null = null;
    let uploadedCloudName: string | null = null;

    try {
        const {
            className,
            stream = 'General',
            subjectName,
            chapterNumber,
            chapterName,
            title,
            description,
            type,
            youtubeUrl,
            videoTitle,
            duration,
            paperYear,
            examType,
            totalMarks,
            hasSolution,
            session,
            order
        } = req.body;

        if (!className || !subjectName || !chapterName || !title || !type) {
            return res.status(400).json({
                success: false,
                message: 'Required fields missing: className, subjectName, chapterName, title, and type are mandatory.'
            });
        }

        const materialData: Partial<IStudyMaterial> = {
            className: className.trim(),
            stream: stream || 'General',
            subjectName: subjectName.trim(),
            chapterNumber: Number(chapterNumber) || 1,
            chapterName: chapterName.trim(),
            title: title.trim(),
            description: description?.trim(),
            type: type as StudyMaterialType,
            session: session || '2025-2026',
            order: Number(order) || 0,
            isPublished: true
        };

        const storage = getStorageService();

        // Type 1 & 3: PDF Notes or Question Papers
        if (type === 'notes' || type === 'papers') {
            if (req.file) {
                const uploadRes = await storage.uploadFile(req.file.path, {
                    folder: `study_materials/${type}`,
                    resourceType: 'auto'
                });

                uploadedPublicId = uploadRes.publicId;
                uploadedCloudName = uploadRes.cloudName || null;

                materialData.pdfUrl = uploadRes.url;
                materialData.pdfPublicId = uploadRes.publicId;
                materialData.cloudProvider = uploadRes.cloudProvider;
                materialData.cloudName = uploadRes.cloudName;
                materialData.fileSizeBytes = uploadRes.fileSizeBytes;
                materialData.formattedSize = uploadRes.formattedSize;
            } else if (req.body.pdfUrl) {
                // External/Direct PDF URL provided
                materialData.pdfUrl = req.body.pdfUrl;
                materialData.formattedSize = req.body.formattedSize || 'PDF';
            }

            if (type === 'papers') {
                materialData.paperYear = paperYear || new Date().getFullYear().toString();
                materialData.examType = examType || 'Sample Paper';
                materialData.totalMarks = totalMarks ? Number(totalMarks) : undefined;
                materialData.hasSolution = hasSolution === 'true' || hasSolution === true;
            }
        }

        // Type 2: Video Lectures (YouTube)
        if (type === 'lectures') {
            const rawYoutube = youtubeUrl || req.body.videoUrl;
            const videoId = extractYouTubeId(rawYoutube);

            materialData.youtubeUrl = rawYoutube;
            materialData.youtubeVideoId = videoId || undefined;
            materialData.videoTitle = videoTitle || title;
            materialData.duration = duration || undefined;
            materialData.thumbnailUrl = videoId
                ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
                : undefined;
        }

        const newMaterial = new StudyMaterial(materialData);
        await newMaterial.save();

        res.status(201).json({
            success: true,
            message: 'Study material created successfully',
            data: newMaterial
        });
    } catch (error: any) {
        console.error('[StudyMaterialController] Error creating study material:', error);

        // Rollback uploaded file if DB save fails
        if (uploadedPublicId) {
            try {
                await getStorageService().deleteFile(uploadedPublicId, uploadedCloudName || undefined);
            } catch (cleanupErr) {
                console.error('[StudyMaterialController] Error during cleanup rollback:', cleanupErr);
            }
        }

        res.status(500).json({ success: false, message: 'Failed to create study material', error: error.message });
    }
};

/**
 * PUT /api/admin/study-material/:id
 */
export const updateStudyMaterial = async (req: Request, res: Response) => {
    try {
        const material = await StudyMaterial.findById(req.params.id);
        if (!material) {
            return res.status(404).json({ success: false, message: 'Study material not found' });
        }

        const {
            className,
            stream,
            subjectName,
            chapterNumber,
            chapterName,
            title,
            description,
            type,
            youtubeUrl,
            videoTitle,
            duration,
            paperYear,
            examType,
            totalMarks,
            hasSolution,
            isPublished,
            order
        } = req.body;

        if (className) material.className = className.trim();
        if (stream) material.stream = stream;
        if (subjectName) material.subjectName = subjectName.trim();
        if (chapterNumber !== undefined) material.chapterNumber = Number(chapterNumber);
        if (chapterName) material.chapterName = chapterName.trim();
        if (title) material.title = title.trim();
        if (description !== undefined) material.description = description?.trim();
        if (isPublished !== undefined) material.isPublished = isPublished === 'true' || isPublished === true;
        if (order !== undefined) material.order = Number(order);

        // If file is updated for notes / papers
        if (req.file) {
            const storage = getStorageService();

            // Delete old file if existed
            if (material.pdfPublicId) {
                await storage.deleteFile(material.pdfPublicId, material.cloudName);
            }

            const uploadRes = await storage.uploadFile(req.file.path, {
                folder: `study_materials/${material.type}`,
                resourceType: 'auto'
            });

            material.pdfUrl = uploadRes.url;
            material.pdfPublicId = uploadRes.publicId;
            material.cloudProvider = uploadRes.cloudProvider;
            material.cloudName = uploadRes.cloudName;
            material.fileSizeBytes = uploadRes.fileSizeBytes;
            material.formattedSize = uploadRes.formattedSize;
        }

        // Update YouTube details if provided
        if (youtubeUrl) {
            const videoId = extractYouTubeId(youtubeUrl);
            material.youtubeUrl = youtubeUrl;
            material.youtubeVideoId = videoId || undefined;
            material.videoTitle = videoTitle || material.title;
            material.duration = duration || material.duration;
            material.thumbnailUrl = videoId
                ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
                : material.thumbnailUrl;
        }

        if (paperYear) material.paperYear = paperYear;
        if (examType) material.examType = examType;
        if (totalMarks !== undefined) material.totalMarks = Number(totalMarks);
        if (hasSolution !== undefined) material.hasSolution = hasSolution === 'true' || hasSolution === true;

        await material.save();

        res.status(200).json({
            success: true,
            message: 'Study material updated successfully',
            data: material
        });
    } catch (error: any) {
        console.error('[StudyMaterialController] Error updating study material:', error);
        res.status(500).json({ success: false, message: 'Failed to update study material', error: error.message });
    }
};

/**
 * DELETE /api/admin/study-material/:id
 */
export const deleteStudyMaterial = async (req: Request, res: Response) => {
    try {
        const material = await StudyMaterial.findById(req.params.id);
        if (!material) {
            return res.status(404).json({ success: false, message: 'Study material not found' });
        }

        // Clean up cloud storage
        if (material.pdfPublicId) {
            const storage = getStorageService();
            await storage.deleteFile(material.pdfPublicId, material.cloudName);
        }

        if (material.solutionPublicId) {
            const storage = getStorageService();
            await storage.deleteFile(material.solutionPublicId, material.cloudName);
        }

        await StudyMaterial.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Study material and associated storage deleted successfully'
        });
    } catch (error: any) {
        console.error('[StudyMaterialController] Error deleting study material:', error);
        res.status(500).json({ success: false, message: 'Failed to delete study material', error: error.message });
    }
};

/**
 * POST /api/study-material/:id/download
 * Atomic analytics counter
 */
export const incrementDownloadCount = async (req: Request, res: Response) => {
    try {
        const material = await StudyMaterial.findByIdAndUpdate(
            req.params.id,
            { $inc: { downloadsCount: 1 } },
            { new: true }
        );
        res.status(200).json({ success: true, downloadsCount: material?.downloadsCount || 0 });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Error updating download count' });
    }
};

/**
 * POST /api/study-material/:id/view
 * Atomic analytics counter
 */
export const incrementViewCount = async (req: Request, res: Response) => {
    try {
        const material = await StudyMaterial.findByIdAndUpdate(
            req.params.id,
            { $inc: { viewsCount: 1 } },
            { new: true }
        );
        res.status(200).json({ success: true, viewsCount: material?.viewsCount || 0 });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Error updating view count' });
    }
};

/**
 * POST /api/admin/study-material/seed-default
 * Seed initial real syllabus structure for classes I to XII with realistic chapters
 */
export const seedDefaultStructure = async (req: Request, res: Response) => {
    try {
        const count = await StudyMaterial.countDocuments();
        if (count > 0 && req.query.force !== 'true') {
            return res.status(200).json({
                success: true,
                message: 'Materials already exist. Use ?force=true to seed additional standard items.',
                count
            });
        }

        // Realistic curriculum seeds with YouTube sample lectures and notes
        const seedItems = [
            // Class X - Mathematics
            {
                className: 'Class X',
                stream: 'General',
                subjectName: 'Mathematics',
                chapterNumber: 1,
                chapterName: 'Chapter 1: Real Numbers',
                title: 'Euclid Division Lemma & Fundamental Theorem of Arithmetic',
                type: 'notes',
                pdfUrl: 'https://res.cloudinary.com/demo/image/upload/sample.pdf',
                formattedSize: '1.8 MB',
                isPublished: true
            },
            {
                className: 'Class X',
                stream: 'General',
                subjectName: 'Mathematics',
                chapterNumber: 1,
                chapterName: 'Chapter 1: Real Numbers',
                title: 'Real Numbers Detailed Concept & Proof of Irrationality',
                type: 'lectures',
                youtubeUrl: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
                youtubeVideoId: 'kJQP7kiw5Fk',
                videoTitle: 'Class 10 Math: Real Numbers Full Chapter',
                duration: '42:15',
                thumbnailUrl: 'https://img.youtube.com/vi/kJQP7kiw5Fk/hqdefault.jpg',
                isPublished: true
            },
            {
                className: 'Class X',
                stream: 'General',
                subjectName: 'Mathematics',
                chapterNumber: 1,
                chapterName: 'Chapter 1: Real Numbers',
                title: 'Real Numbers CBSE Board 10 Years PYQ & Practice Sheet',
                type: 'papers',
                pdfUrl: 'https://res.cloudinary.com/demo/image/upload/sample.pdf',
                paperYear: '2024',
                examType: 'CBSE Board Sample Paper',
                totalMarks: 80,
                hasSolution: true,
                formattedSize: '1.2 MB',
                isPublished: true
            },

            // Class X - Science
            {
                className: 'Class X',
                stream: 'General',
                subjectName: 'Science',
                chapterNumber: 1,
                chapterName: 'Chapter 1: Chemical Reactions & Equations',
                title: 'Types of Chemical Reactions, Balancing & Oxidation',
                type: 'notes',
                pdfUrl: 'https://res.cloudinary.com/demo/image/upload/sample.pdf',
                formattedSize: '2.5 MB',
                isPublished: true
            },
            {
                className: 'Class X',
                stream: 'General',
                subjectName: 'Science',
                chapterNumber: 1,
                chapterName: 'Chapter 1: Chemical Reactions & Equations',
                title: 'Chemical Reactions and Equations Animated Experiment Lecture',
                type: 'lectures',
                youtubeUrl: 'https://www.youtube.com/watch?v=fJ9rUzIMcZQ',
                youtubeVideoId: 'fJ9rUzIMcZQ',
                videoTitle: 'Class 10 Science: Chemical Reactions with Live Lab',
                duration: '38:40',
                thumbnailUrl: 'https://img.youtube.com/vi/fJ9rUzIMcZQ/hqdefault.jpg',
                isPublished: true
            },
            {
                className: 'Class X',
                stream: 'General',
                subjectName: 'Science',
                chapterNumber: 1,
                chapterName: 'Chapter 1: Chemical Reactions & Equations',
                title: 'Chemical Reactions Chapter Test & Assessment Paper',
                type: 'papers',
                pdfUrl: 'https://res.cloudinary.com/demo/image/upload/sample.pdf',
                paperYear: '2024',
                examType: 'Unit Assessment Paper',
                totalMarks: 40,
                formattedSize: '950 KB',
                isPublished: true
            },

            // Class XII - Physics
            {
                className: 'Class XII',
                stream: 'Science',
                subjectName: 'Physics',
                chapterNumber: 1,
                chapterName: 'Chapter 1: Electrostatics & Fields',
                title: "Coulomb's Law, Electric Dipole & Gauss Theorem Derivations",
                type: 'notes',
                pdfUrl: 'https://res.cloudinary.com/demo/image/upload/sample.pdf',
                formattedSize: '4.2 MB',
                isPublished: true
            },
            {
                className: 'Class XII',
                stream: 'Science',
                subjectName: 'Physics',
                chapterNumber: 1,
                chapterName: 'Chapter 1: Electrostatics & Fields',
                title: 'Gauss Law Applications & Electric Potential Marathon',
                type: 'lectures',
                youtubeUrl: 'https://www.youtube.com/watch?v=3JZ_D3ELwOQ',
                youtubeVideoId: '3JZ_D3ELwOQ',
                videoTitle: 'Class 12 Physics: Electrostatics Complete Masterclass',
                duration: '55:20',
                thumbnailUrl: 'https://img.youtube.com/vi/3JZ_D3ELwOQ/hqdefault.jpg',
                isPublished: true
            },
            {
                className: 'Class XII',
                stream: 'Science',
                subjectName: 'Physics',
                chapterNumber: 1,
                chapterName: 'Chapter 1: Electrostatics & Fields',
                title: 'Class 12 Physics Pre-Board Question Paper with Blueprint',
                type: 'papers',
                pdfUrl: 'https://res.cloudinary.com/demo/image/upload/sample.pdf',
                paperYear: '2024-25',
                examType: 'Pre-Board Examination',
                totalMarks: 70,
                hasSolution: true,
                formattedSize: '2.1 MB',
                isPublished: true
            }
        ];

        await StudyMaterial.insertMany(seedItems);

        res.status(201).json({
            success: true,
            message: 'Seeded realistic curriculum and study materials successfully',
            count: seedItems.length
        });
    } catch (error: any) {
        console.error('[StudyMaterialController] Seed error:', error);
        res.status(500).json({ success: false, message: 'Failed to seed study materials', error: error.message });
    }
};
