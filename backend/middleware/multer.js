const multer = require('multer');
const path = require('path');

// Configure memory storage for direct streaming to Cloudinary
const storage = multer.memoryStorage();

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024, // Reduced to 100MB for free Cloudinary account compatibility
    },
    fileFilter: function (req, file, cb) {
        // Accept video files and images
        if (!file.originalname.match(/\.(mp4|mov|avi|wmv|mkv|flv|webm|jpg|jpeg|png|gif)$/i)) {
            return cb(new Error('Only video and image files are allowed!'), false);
        }
        cb(null, true);
    }
});

module.exports = { upload };
