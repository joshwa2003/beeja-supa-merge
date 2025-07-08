const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
    initializeChunkedUpload,
    uploadChunk,
    completeChunkedUpload,
    getUploadProgress
} = require('../utils/chunkedVideoUploader');
const ChunkedVideo = require('../models/chunkedVideo');

// Middleware to parse JSON and handle file uploads
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Initialize chunked upload
 * POST /api/chunked-upload/initialize
 */
router.post('/initialize', auth, upload.single('video'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No video file provided'
            });
        }

        const { folder = 'videos' } = req.body;
        
        const result = await initializeChunkedUpload(req.file, folder);
        
        res.status(200).json({
            success: true,
            data: result,
            message: 'Chunked upload initialized successfully'
        });
    } catch (error) {
        console.error('Error initializing chunked upload:', error);
        res.status(500).json({
            success: false,
            message: error.message,
            error: 'Failed to initialize chunked upload'
        });
    }
});

/**
 * Upload a single chunk
 * POST /api/chunked-upload/chunk
 */
router.post('/chunk', auth, upload.single('chunk'), async (req, res) => {
    try {
        const { videoId, chunkIndex } = req.body;
        
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No chunk data provided'
            });
        }

        if (!videoId || chunkIndex === undefined) {
            return res.status(400).json({
                success: false,
                message: 'videoId and chunkIndex are required'
            });
        }

        const result = await uploadChunk(videoId, parseInt(chunkIndex), req.file.buffer);
        
        res.status(200).json({
            success: true,
            data: result,
            message: `Chunk ${chunkIndex} uploaded successfully`
        });
    } catch (error) {
        console.error('Error uploading chunk:', error);
        res.status(500).json({
            success: false,
            message: error.message,
            error: 'Failed to upload chunk'
        });
    }
});

/**
 * Complete chunked upload
 * POST /api/chunked-upload/complete
 */
router.post('/complete', auth, async (req, res) => {
    try {
        const { videoId } = req.body;
        
        if (!videoId) {
            return res.status(400).json({
                success: false,
                message: 'videoId is required'
            });
        }

        const result = await completeChunkedUpload(videoId);
        
        res.status(200).json({
            success: true,
            data: result,
            message: 'Chunked upload completed successfully'
        });
    } catch (error) {
        console.error('Error completing chunked upload:', error);
        res.status(500).json({
            success: false,
            message: error.message,
            error: 'Failed to complete chunked upload'
        });
    }
});

/**
 * Get upload progress
 * GET /api/chunked-upload/progress/:videoId
 */
router.get('/progress/:videoId', auth, async (req, res) => {
    try {
        const { videoId } = req.params;
        
        const result = await getUploadProgress(videoId);
        
        res.status(200).json({
            success: true,
            data: result,
            message: 'Upload progress retrieved successfully'
        });
    } catch (error) {
        console.error('Error getting upload progress:', error);
        res.status(500).json({
            success: false,
            message: error.message,
            error: 'Failed to get upload progress'
        });
    }
});

/**
 * Get all chunked uploads for a user (for debugging/admin)
 * GET /api/chunked-upload/list
 */
router.get('/list', auth, async (req, res) => {
    try {
        const { page = 1, limit = 10, status } = req.query;
        
        const query = {};
        if (status === 'complete') {
            query.isComplete = true;
        } else if (status === 'incomplete') {
            query.isComplete = false;
        }

        const chunkedVideos = await ChunkedVideo.find(query)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .select('videoId originalFilename totalSize uploadProgress isComplete createdAt completedAt finalVideoUrl');

        const total = await ChunkedVideo.countDocuments(query);

        res.status(200).json({
            success: true,
            data: {
                uploads: chunkedVideos,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            },
            message: 'Chunked uploads retrieved successfully'
        });
    } catch (error) {
        console.error('Error listing chunked uploads:', error);
        res.status(500).json({
            success: false,
            message: error.message,
            error: 'Failed to list chunked uploads'
        });
    }
});

/**
 * Cancel/Delete an incomplete chunked upload
 * DELETE /api/chunked-upload/:videoId
 */
router.delete('/:videoId', auth, async (req, res) => {
    try {
        const { videoId } = req.params;
        
        const chunkedVideo = await ChunkedVideo.findOne({ videoId });
        if (!chunkedVideo) {
            return res.status(404).json({
                success: false,
                message: 'Chunked upload not found'
            });
        }

        if (chunkedVideo.isComplete) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete completed upload'
            });
        }

        // Clean up chunks
        const { cleanupChunks } = require('../utils/chunkedVideoUploader');
        await cleanupChunks(videoId);

        // Remove from database
        await ChunkedVideo.deleteOne({ videoId });

        res.status(200).json({
            success: true,
            message: 'Chunked upload cancelled and cleaned up successfully'
        });
    } catch (error) {
        console.error('Error cancelling chunked upload:', error);
        res.status(500).json({
            success: false,
            message: error.message,
            error: 'Failed to cancel chunked upload'
        });
    }
});

module.exports = router;
