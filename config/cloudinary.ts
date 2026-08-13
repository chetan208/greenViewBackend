import dotenv from 'dotenv';

dotenv.config();
import { v2 as cloudinary, ConfigOptions } from 'cloudinary';

const accounts: ConfigOptions[] = [
    {
        cloud_name: process.env.CLOUDINARY_NAME_1,
        api_key: process.env.CLOUDINARY_KEY_1,
        api_secret: process.env.CLOUDINARY_SECRET_1
    },
    {
        cloud_name: process.env.CLOUDINARY_NAME_2,
        api_key: process.env.CLOUDINARY_KEY_2,
        api_secret: process.env.CLOUDINARY_SECRET_2
    },
    {
        cloud_name: process.env.CLOUDINARY_NAME_3,
        api_key: process.env.CLOUDINARY_KEY_3,
        api_secret: process.env.CLOUDINARY_SECRET_3
    },
    {
        cloud_name: process.env.CLOUDINARY_NAME_4,
        api_key: process.env.CLOUDINARY_KEY_4,
        api_secret: process.env.CLOUDINARY_SECRET_4
    },
    {
        cloud_name: process.env.CLOUDINARY_NAME_5,
        api_key: process.env.CLOUDINARY_KEY_5,
        api_secret: process.env.CLOUDINARY_SECRET_5
    }
    
];



let currentAccountIndex = 0;


export const getNextCloudinaryInstance = (): { cloudinary: typeof cloudinary; cloud_name: any } => {
    const currentAccount = accounts[currentAccountIndex];

    // Dynamic configuration
    cloudinary.config(currentAccount);

    // Round-Robin logic
    currentAccountIndex = (currentAccountIndex + 1) % accounts.length;

    // Return the cloudinary instance and the current cloud name
    return { cloudinary, cloud_name: currentAccount.cloud_name };
};

export const getCloudinaryInstanceByName = (cloudName: string): { cloudinary: typeof cloudinary; cloud_name: any } | null => {

    const account = accounts.find(acc => acc.cloud_name === cloudName);

    if (account) {
        cloudinary.config(account);
        return { cloudinary, cloud_name: account.cloud_name };
    }
    return null;
}