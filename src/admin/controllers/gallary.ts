import { Request, Response } from "express";
import mongoose from "mongoose";
import fs from "fs";
import { Folder, Gallery, IGallery } from "@/model/adminModels/gallary";
import { getCloudinaryInstanceByName, getNextCloudinaryInstance } from "../../../config/cloudinary";

// Helper: Safely extract string parameter from Express 5 req.params or req.query
const getSingleParam = (param: any): string => {
    if (typeof param === 'string') return param;
    if (Array.isArray(param) && typeof param[0] === 'string') return param[0];
    return String(param || '');
};

// Helper: Safe temp file cleanup for multer uploads
const cleanupTempFile = async (filePath?: string) => {
    if (!filePath) return;
    try {
        if (fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath);
        }
    } catch (err) {
        console.error(`Failed to delete temp file at ${filePath}:`, err);
    }
};

// Helper: Cloudinary media deletion supporting images & videos across multiple Cloudinary accounts
interface CloudMediaItem {
    cloudName: string;
    publicId: string;
    mediaType?: 'image' | 'video' | string;
}

const deleteFromCloudinary = async (cloudData: CloudMediaItem[]) => {
    const deletePromises = cloudData.map(async (item) => {
        if (!item.cloudName || !item.publicId || item.cloudName === 'youtube' || item.publicId === 'youtube') return;
        const instance = getCloudinaryInstanceByName(item.cloudName);
        if (instance) {
            const { cloudinary } = instance;
            const resourceType = item.mediaType === 'video' ? 'video' : 'image';
            try {
                await cloudinary.uploader.destroy(item.publicId, {
                    resource_type: resourceType,
                    invalidate: true
                });
            } catch (err) {
                console.error(`Error deleting ${item.publicId} from Cloudinary (${item.cloudName}):`, err);
            }
        }
    });

    await Promise.allSettled(deletePromises);
};

// ==================== FOLDER CONTROLLERS ====================

/**
 * Get all gallery folders with populated media items
 */
export const getFolders = async (req: Request, res: Response) => {
    try {
        const folders = await Folder.find()
            .populate('media')
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json({
            success: true,
            count: folders.length,
            folders
        });
    } catch (error) {
        console.error('Error fetching folders:', error);
        res.status(500).json({ success: false, message: 'Error fetching folders' });
    }
};

/**
 * Get a single folder by ID with populated media
 */
export const getFolderById = async (req: Request, res: Response) => {
    try {
        const id = getSingleParam(req.params.id);

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid folder ID format' });
        }

        const folder = await Folder.findById(id)
            .populate({
                path: 'media',
                options: { sort: { createdAt: -1 } }
            })
            .lean();

        if (!folder) {
            return res.status(404).json({ success: false, message: 'Folder not found' });
        }

        res.status(200).json({ success: true, folder });
    } catch (error) {
        console.error('Error fetching folder:', error);
        res.status(500).json({ success: false, message: 'Error fetching folder' });
    }
};

/**
 * Create a new folder
 */
export const createFolder = async (req: Request, res: Response) => {
    try {
        const { name } = req.body;

        if (!name || typeof name !== 'string' || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Folder name is required' });
        }

        const trimmedName = name.trim();

        const existingFolder = await Folder.findOne({
            name: { $regex: new RegExp(`^${trimmedName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') }
        });

        if (existingFolder) {
            return res.status(400).json({ success: false, message: 'Folder with the same name already exists' });
        }

        const folder = new Folder({ name: trimmedName, media: [] });
        await folder.save();

        res.status(201).json({ success: true, folder });
    } catch (error) {
        console.error('Error creating folder:', error);
        res.status(500).json({ success: false, message: 'Error creating folder' });
    }
};

/**
 * Update folder name
 */
export const updateFolder = async (req: Request, res: Response) => {
    try {
        const id = getSingleParam(req.params.id);
        const { name } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid folder ID format' });
        }

        if (!name || typeof name !== 'string' || !name.trim()) {
            return res.status(400).json({ success: false, message: 'New folder name is required' });
        }

        const trimmedName = name.trim();

        const folder = await Folder.findById(id);
        if (!folder) {
            return res.status(404).json({ success: false, message: 'Folder not found' });
        }

        const duplicate = await Folder.findOne({
            _id: { $ne: id },
            name: { $regex: new RegExp(`^${trimmedName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') }
        });

        if (duplicate) {
            return res.status(400).json({ success: false, message: 'Another folder with this name already exists' });
        }

        folder.name = trimmedName;
        await folder.save();

        res.status(200).json({ success: true, folder });
    } catch (error) {
        console.error('Error updating folder:', error);
        res.status(500).json({ success: false, message: 'Error updating folder' });
    }
};

/**
 * Delete a folder and all associated media from Cloudinary & DB
 */
export const deleteFolder = async (req: Request, res: Response) => {
    try {
        const id = getSingleParam(req.params.id);

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid folder ID format' });
        }

        const folder = await Folder.findById(id);
        if (!folder) {
            return res.status(404).json({ success: false, message: 'Folder not found' });
        }

        const mediaItems = await Gallery.find({ folder: id }).lean();

        if (mediaItems.length > 0) {
            const cloudData: CloudMediaItem[] = mediaItems
                .filter(item => item.cloudName !== 'youtube' && item.publicId !== 'youtube')
                .map(item => ({
                    cloudName: item.cloudName,
                    publicId: item.publicId,
                    mediaType: item.mediaType
                }));

            if (cloudData.length > 0) {
                await deleteFromCloudinary(cloudData);
            }

            await Gallery.deleteMany({ folder: id });
        }

        await Folder.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: 'Folder and all associated media deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting folder:', error);
        res.status(500).json({ success: false, message: 'Error deleting folder' });
    }
};

// ==================== GALLERY MEDIA CONTROLLERS ====================

/**
 * Get paginated gallery media items, optionally filtered by folderId or mediaType
 */
export const getMedia = async (req: Request, res: Response) => {
    try {
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 20));
        const skip = (page - 1) * limit;

        const filter: Record<string, any> = {};

        if (req.query.folderId) {
            const folderId = getSingleParam(req.query.folderId);
            if (!mongoose.Types.ObjectId.isValid(folderId)) {
                return res.status(400).json({ success: false, message: 'Invalid folder ID format' });
            }
            filter.folder = folderId;
        }

        if (req.query.mediaType && ['image', 'video'].includes(req.query.mediaType as string)) {
            filter.mediaType = req.query.mediaType;
        }

        const [media, total] = await Promise.all([
            Gallery.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('folder', 'name')
                .lean(),
            Gallery.countDocuments(filter)
        ]);

        res.status(200).json({
            success: true,
            media,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching media:', error);
        res.status(500).json({ success: false, message: 'Error fetching media items' });
    }
};

/**
 * Get single media item by ID
 */
export const getMediaById = async (req: Request, res: Response) => {
    try {
        const id = getSingleParam(req.params.id);

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid media ID format' });
        }

        const media = await Gallery.findById(id).populate('folder', 'name').lean();

        if (!media) {
            return res.status(404).json({ success: false, message: 'Media item not found' });
        }

        res.status(200).json({ success: true, media });
    } catch (error) {
        console.error('Error fetching media by ID:', error);
        res.status(500).json({ success: false, message: 'Error fetching media item' });
    }
};

/**
 * Add media (File Upload OR YouTube Video Link) to a folder
 */
export const addMediaToFolder = async (req: Request, res: Response) => {
    let uploadedPublicId: string | null = null;
    let usedCloudinaryInstance: any = null;

    try {
        const folderId = getSingleParam(req.params.folderId);
        const { title, mediaType: customMediaType, youtubeUrl, url: providedUrl } = req.body;

        if (!mongoose.Types.ObjectId.isValid(folderId)) {
            await cleanupTempFile(req.file?.path);
            return res.status(400).json({ success: false, message: 'Invalid folder ID format' });
        }

        const folder = await Folder.findById(folderId);
        if (!folder) {
            await cleanupTempFile(req.file?.path);
            return res.status(404).json({ success: false, message: 'Folder not found' });
        }

        const videoLink = youtubeUrl || (customMediaType === 'video' ? providedUrl : undefined);

        // CASE 1: YouTube Video Link (No Cloudinary Upload!)
        if (videoLink || customMediaType === 'video' && !req.file) {
            if (!videoLink || typeof videoLink !== 'string' || !videoLink.trim()) {
                return res.status(400).json({ success: false, message: 'Valid YouTube video URL is required' });
            }

            const media = new Gallery({
                title: title ? title.trim() : 'YouTube Video',
                mediaType: 'video',
                url: videoLink.trim(),
                publicId: 'youtube',
                cloudName: 'youtube',
                folder: folder._id
            });

            await media.save();
            await Folder.findByIdAndUpdate(folder._id, { $push: { media: media._id } });

            return res.status(201).json({ success: true, media });
        }

        // CASE 2: Image or Video File Upload to Cloudinary
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No media file or video link provided' });
        }

        let mediaType: 'image' | 'video' = 'image';
        if (customMediaType === 'video' || req.file.mimetype.startsWith('video/')) {
            mediaType = 'video';
        }

        const { cloudinary, cloud_name } = getNextCloudinaryInstance();

        const uploadResult = await cloudinary.uploader.upload(req.file.path, {
            folder: `gallery/${folder.name}`,
            resource_type: 'auto'
        });

        uploadedPublicId = uploadResult.public_id;
        usedCloudinaryInstance = cloudinary;

        await cleanupTempFile(req.file.path);

        const media = new Gallery({
            title: title ? title.trim() : req.file.originalname,
            mediaType,
            url: uploadResult.secure_url,
            publicId: uploadResult.public_id,
            folder: folder._id,
            cloudName: cloud_name
        });

        await media.save();
        await Folder.findByIdAndUpdate(folder._id, { $push: { media: media._id } });

        res.status(201).json({ success: true, media });
    } catch (error) {
        console.error('Error adding media to folder:', error);

        if (uploadedPublicId && usedCloudinaryInstance) {
            try {
                await usedCloudinaryInstance.uploader.destroy(uploadedPublicId, { invalidate: true });
            } catch (cleanupErr) {
                console.error('Failed to rollback Cloudinary upload:', cleanupErr);
            }
        }

        await cleanupTempFile(req.file?.path);
        res.status(500).json({ success: false, message: 'Error adding media to folder' });
    }
};

/**
 * Upload multiple media files into a folder in batch
 */
export const addMultipleMediaToFolder = async (req: Request, res: Response) => {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
        return res.status(400).json({ success: false, message: 'No files uploaded' });
    }

    try {
        const folderId = getSingleParam(req.params.folderId);

        if (!mongoose.Types.ObjectId.isValid(folderId)) {
            for (const file of files) {
                await cleanupTempFile(file.path);
            }
            return res.status(400).json({ success: false, message: 'Invalid folder ID format' });
        }

        const folder = await Folder.findById(folderId);
        if (!folder) {
            for (const file of files) {
                await cleanupTempFile(file.path);
            }
            return res.status(404).json({ success: false, message: 'Folder not found' });
        }

        const createdMediaList: IGallery[] = [];
        const newMediaIds: mongoose.Types.ObjectId[] = [];

        for (const file of files) {
            const mediaType: 'image' | 'video' = file.mimetype.startsWith('video/') ? 'video' : 'image';
            const { cloudinary, cloud_name } = getNextCloudinaryInstance();

            const uploadResult = await cloudinary.uploader.upload(file.path, {
                folder: `gallery/${folder.name}`,
                resource_type: 'auto'
            });

            await cleanupTempFile(file.path);

            const media = new Gallery({
                title: file.originalname,
                mediaType,
                url: uploadResult.secure_url,
                publicId: uploadResult.public_id,
                folder: folder._id,
                cloudName: cloud_name
            });

            await media.save();
            createdMediaList.push(media);
            newMediaIds.push(media._id as mongoose.Types.ObjectId);
        }

        await Folder.findByIdAndUpdate(folder._id, { $push: { media: { $each: newMediaIds } } });

        res.status(201).json({
            success: true,
            count: createdMediaList.length,
            media: createdMediaList
        });
    } catch (error) {
        console.error('Error in batch media upload:', error);

        if (files && files.length > 0) {
            for (const file of files) {
                await cleanupTempFile(file.path);
            }
        }

        res.status(500).json({ success: false, message: 'Error performing batch media upload' });
    }
};

/**
 * Update a media item's title or replace its file
 */
export const updateMedia = async (req: Request, res: Response) => {
    try {
        const id = getSingleParam(req.params.id);
        const { title, mediaType: customMediaType, youtubeUrl } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            await cleanupTempFile(req.file?.path);
            return res.status(400).json({ success: false, message: 'Invalid media ID format' });
        }

        const media = await Gallery.findById(id);
        if (!media) {
            await cleanupTempFile(req.file?.path);
            return res.status(404).json({ success: false, message: 'Media item not found' });
        }

        if (title && typeof title === 'string') {
            media.title = title.trim();
        }

        if (youtubeUrl && typeof youtubeUrl === 'string') {
            media.url = youtubeUrl.trim();
            media.mediaType = 'video';
            media.cloudName = 'youtube';
            media.publicId = 'youtube';
        } else if (req.file) {
            const oldCloudName = media.cloudName;
            const oldPublicId = media.publicId;
            const oldMediaType = media.mediaType;

            const folder = await Folder.findById(media.folder);
            const folderName = folder ? folder.name : 'general';

            let newMediaType: 'image' | 'video' = media.mediaType;
            if (customMediaType === 'video' || req.file.mimetype.startsWith('video/')) {
                newMediaType = 'video';
            } else if (customMediaType === 'image' || req.file.mimetype.startsWith('image/')) {
                newMediaType = 'image';
            }

            const { cloudinary, cloud_name } = getNextCloudinaryInstance();

            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: `gallery/${folderName}`,
                resource_type: 'auto'
            });

            await cleanupTempFile(req.file.path);

            media.url = result.secure_url;
            media.publicId = result.public_id;
            media.cloudName = cloud_name;
            media.mediaType = newMediaType;

            if (oldCloudName && oldPublicId && oldCloudName !== 'youtube' && oldPublicId !== 'youtube') {
                await deleteFromCloudinary([{
                    cloudName: oldCloudName,
                    publicId: oldPublicId,
                    mediaType: oldMediaType
                }]);
            }
        }

        await media.save();

        res.status(200).json({ success: true, media });
    } catch (error) {
        console.error('Error updating media item:', error);
        await cleanupTempFile(req.file?.path);
        res.status(500).json({ success: false, message: 'Error updating media item' });
    }
};

/**
 * Delete a media item from Cloudinary (if applicable) and DB, and remove from parent folder
 */
export const deleteMedia = async (req: Request, res: Response) => {
    try {
        const id = getSingleParam(req.params.id);

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid media ID format' });
        }

        const media = await Gallery.findById(id);
        if (!media) {
            return res.status(404).json({ success: false, message: 'Media item not found' });
        }

        if (media.cloudName && media.publicId && media.cloudName !== 'youtube' && media.publicId !== 'youtube') {
            await deleteFromCloudinary([{
                cloudName: media.cloudName,
                publicId: media.publicId,
                mediaType: media.mediaType
            }]);
        }

        if (media.folder) {
            await Folder.findByIdAndUpdate(media.folder, {
                $pull: { media: media._id }
            });
        }

        await Gallery.findByIdAndDelete(id);

        res.status(200).json({ success: true, message: 'Media item deleted successfully' });
    } catch (error) {
        console.error('Error deleting media item:', error);
        res.status(500).json({ success: false, message: 'Error deleting media item' });
    }
};

/**
 * Delete multiple media items in batch
 */
export const deleteMultipleMedia = async (req: Request, res: Response) => {
    try {
        const { ids } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ success: false, message: 'No media IDs provided' });
        }

        const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id));
        if (validIds.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid media ID format' });
        }

        const mediaItems = await Gallery.find({ _id: { $in: validIds } }).lean();

        if (mediaItems.length > 0) {
            const cloudData: CloudMediaItem[] = mediaItems
                .filter(item => item.cloudName !== 'youtube' && item.publicId !== 'youtube')
                .map(item => ({
                    cloudName: item.cloudName,
                    publicId: item.publicId,
                    mediaType: item.mediaType
                }));

            if (cloudData.length > 0) {
                await deleteFromCloudinary(cloudData);
            }

            // Remove from parent folders
            const folderIds = [...new Set(mediaItems.map(item => item.folder.toString()))];
            for (const folderId of folderIds) {
                await Folder.findByIdAndUpdate(folderId, {
                    $pull: { media: { $in: validIds } }
                });
            }

            // Delete from MongoDB
            await Gallery.deleteMany({ _id: { $in: validIds } });
        }

        res.status(200).json({
            success: true,
            count: mediaItems.length,
            message: `${mediaItems.length} media item(s) deleted successfully`
        });
    } catch (error) {
        console.error('Error in batch media deletion:', error);
        res.status(500).json({ success: false, message: 'Error deleting media items' });
    }
};