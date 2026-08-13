import { Request, Response } from "express";
import Notice from "@/model/adminModels/notice";
import { INotice } from "@/model/adminModels/notice";
import { getCloudinaryInstanceByName, getNextCloudinaryInstance } from "../../../config/cloudinary"

export const getNotices = async (req: Request, res: Response) => {
    try {
        const pageNum = parseInt(req.params.pageNum as string) || 1;
        const limit = 10;
        const skip = (pageNum - 1) * limit;

        const notices = await Notice.find().skip(skip).limit(limit);
        res.status(200).json({ notices, pageNum });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching notices' });
    }
};

export const createNotice = async (req: Request, res: Response) => {


    let uploadedCloudName: string | null = null;
    let uploadedPublicId: string | null = null;
    let usedCloudinaryInstance: any = null;

    try {

        const { title, description } = req.body as INotice;
        const notice = new Notice({ title, description });


        if (req.file) {
            const { cloudinary, cloud_name } = getNextCloudinaryInstance();
            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: 'notices'
            });

            uploadedCloudName = cloud_name;
            uploadedPublicId = result.public_id;
            usedCloudinaryInstance = cloudinary;

            notice.documentUrl = result.secure_url;
            notice.documentPublicId = result.public_id;
            notice.cloudName = cloud_name;

        }


        await notice.save();

        res.status(201).json(notice);

    } catch (error) {
        console.log('Error creating notice:', error);
        if (uploadedCloudName && uploadedPublicId && usedCloudinaryInstance) {
            try {
                await usedCloudinaryInstance.uploader.destroy(uploadedPublicId);
            } catch (cloudinaryError) {
                console.error('Error cleaning up uploaded document:', cloudinaryError);
            }

            res.status(500).json({ message: 'Error creating notice' });
        }
    }
}

export const updateNotice = async (req: Request, res: Response) => {
        const noticeId = req.params.id;
        const { title, description } = req.body as INotice;

        try {
            const notice = await Notice.findById(noticeId);

            if (!notice) {
                return res.status(404).json({ message: 'Notice not found' });
            }

            const oldDocumentPublicId = notice.documentPublicId;
            const oldCloudName = notice.cloudName;

            if (req.file) {
                // delete the old document from Cloudinary if it exists
                if (notice.documentPublicId && notice.cloudName) {
                    const instance = getCloudinaryInstanceByName(notice.cloudName);
                    if (instance) {
                        const { cloudinary } = instance;
                        await cloudinary.uploader.destroy(notice.documentPublicId);
                    }
                }

                const { cloudinary, cloud_name } = getNextCloudinaryInstance();
                const result = await cloudinary.uploader.upload(req.file.path, {
                    folder: 'notices'
                });




                notice.documentUrl = result.secure_url;
                notice.documentPublicId = result.public_id;
                notice.cloudName = cloud_name;
            }
            notice.title = title;
            notice.description = description;
            await notice.save();


            if (req.file && oldDocumentPublicId && oldCloudName) {
                const oldInstance = getCloudinaryInstanceByName(oldCloudName);
                if (oldInstance) {
                    const { cloudinary } = oldInstance;
                    await cloudinary.uploader.destroy(oldDocumentPublicId);
                }
            }


            res.status(200).json(notice);
        } catch (error) {
            console.log('Error updating notice:', error);
            res.status(500).json({ message: 'Error updating notice' });
        }
    }

export const deleteNotice = async (req: Request, res: Response) => {

        const noticeId = req.params.id;

        try {
            const notice = await Notice.findById(noticeId);

            if (!notice) {
                return res.status(404).json({ message: 'Notice not found' });
            }

            if (notice.documentPublicId && notice.cloudName) {
                const instance = getCloudinaryInstanceByName(notice.cloudName);
                if (instance) {
                    const { cloudinary } = instance;
                    await cloudinary.uploader.destroy(notice.documentPublicId);
                } else {
                    console.warn(`Cloudinary instance not found for cloud name: ${notice.cloudName}`);
                }
            }

            await Notice.findByIdAndDelete(noticeId);

            res.status(200).json({ message: 'Notice deleted successfully' });
        } catch (error) {
            console.error('Error deleting notice:', error);
            res.status(500).json({ message: 'Error deleting notice' });
        }
    }