const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { AppError } = require('./errorMiddleware');

const postersDir = path.join(__dirname, '..', 'public', 'uploads', 'posters');

if (!fs.existsSync(postersDir)) {
    fs.mkdirSync(postersDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, postersDir);
    },
    filename: (req, file, cb) => {
        const extension = path.extname(file.originalname).toLowerCase();
        const safeTitle = (req.body.title || 'movie')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '')
            .slice(0, 50) || 'movie';

        cb(null, `${safeTitle}_${Date.now()}${extension}`);
    }
});

const allowedMimeTypes = new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
]);

const fileFilter = (req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
        return cb(new AppError('Invalid poster format. Allowed types: jpg, jpeg, png, webp', 400));
    }
    cb(null, true);
};

const uploadPoster = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});

const handlePosterUpload = (req, res, next) => {
    uploadPoster.single('poster')(req, res, (err) => {
        if (!err) {
            return next();
        }

        if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
            req.uploadError = 'Poster file is too large. Maximum size is 5MB.';
            return next();
        }

        if (err instanceof AppError) {
            req.uploadError = err.message;
            return next();
        }

        return next(err);
    });
};

module.exports = { uploadPoster, handlePosterUpload };
