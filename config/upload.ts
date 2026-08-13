import multer from "multer";

const storage = multer.diskStorage({});

const upload = multer({ 
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10 MB limit per file
    }
});

export default upload;