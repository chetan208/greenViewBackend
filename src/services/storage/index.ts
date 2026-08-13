import { IStorageProvider } from './IStorageProvider';
import { CloudinaryStorageProvider } from './CloudinaryStorageProvider';

export * from './IStorageProvider';
export * from './CloudinaryStorageProvider';

// Singleton instance
let currentProvider: IStorageProvider | null = null;

/**
 * Get active storage provider.
 * To switch to AWS S3, Firebase, or GCS in the future:
 * 1. Implement IStorageProvider (e.g. S3StorageProvider.ts)
 * 2. Return new S3StorageProvider() based on process.env.STORAGE_PROVIDER
 */
export const getStorageService = (): IStorageProvider => {
    if (!currentProvider) {
        const providerType = (process.env.STORAGE_PROVIDER || 'cloudinary').toLowerCase();
        
        switch (providerType) {
            case 'cloudinary':
            default:
                currentProvider = new CloudinaryStorageProvider();
                break;
        }
    }
    return currentProvider;
};

export default getStorageService;
