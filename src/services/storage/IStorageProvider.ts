export interface UploadOptions {
    folder?: string;
    resourceType?: 'auto' | 'image' | 'raw' | 'video';
    allowedFormats?: string[];
    maxSizeBytes?: number;
    metadata?: Record<string, any>;
}

export interface UploadResult {
    url: string;
    publicId: string;
    cloudProvider: string;
    cloudName?: string;
    fileSizeBytes?: number;
    formattedSize?: string;
    mimeType?: string;
    originalFilename?: string;
}

export interface IStorageProvider {
    readonly providerName: string;

    /**
     * Upload a file from local path to cloud storage
     */
    uploadFile(filePath: string, options?: UploadOptions): Promise<UploadResult>;

    /**
     * Delete a file from cloud storage by its public ID / key
     */
    deleteFile(publicId: string, cloudName?: string): Promise<boolean>;

    /**
     * Helper to format bytes into readable strings (e.g. 2.4 MB)
     */
    formatFileSize(bytes: number): string;
}
