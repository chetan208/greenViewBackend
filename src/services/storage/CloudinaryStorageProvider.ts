import fs from 'fs';
import { IStorageProvider, UploadOptions, UploadResult } from './IStorageProvider';
import { getNextCloudinaryInstance, getCloudinaryInstanceByName } from '../../../config/cloudinary';

export class CloudinaryStorageProvider implements IStorageProvider {
    readonly providerName = 'cloudinary';

    formatFileSize(bytes: number): string {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    async uploadFile(filePath: string, options: UploadOptions = {}): Promise<UploadResult> {
        const { cloudinary, cloud_name } = getNextCloudinaryInstance();

        // Determine file size from local filesystem if possible
        let fileSizeBytes = 0;
        try {
            const stats = fs.statSync(filePath);
            fileSizeBytes = stats.size;
        } catch (e) {
            // Ignore if already stream or removed
        }

        const uploadOptions: any = {
            folder: options.folder || 'academic_materials',
            resource_type: options.resourceType || 'auto'
        };

        const result = await cloudinary.uploader.upload(filePath, uploadOptions);

        const bytes = result.bytes || fileSizeBytes;

        return {
            url: result.secure_url,
            publicId: result.public_id,
            cloudProvider: this.providerName,
            cloudName: cloud_name,
            fileSizeBytes: bytes,
            formattedSize: this.formatFileSize(bytes),
            mimeType: result.format ? `application/${result.format}` : undefined,
            originalFilename: result.original_filename
        };
    }

    async deleteFile(publicId: string, cloudName?: string): Promise<boolean> {
        try {
            if (!publicId) return false;

            let instance: { cloudinary: any; cloud_name: any } | null = null;
            if (cloudName) {
                instance = getCloudinaryInstanceByName(cloudName);
            }

            if (!instance) {
                instance = getNextCloudinaryInstance();
            }

            const { cloudinary } = instance;
            // Try destroying as image/raw
            const res = await cloudinary.uploader.destroy(publicId);
            if (res.result === 'ok') return true;

            // If not found in default resource type, try raw for PDFs
            const rawRes = await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
            return rawRes.result === 'ok';
        } catch (error) {
            console.error('[CloudinaryStorageProvider] Error deleting file:', error);
            return false;
        }
    }
}
