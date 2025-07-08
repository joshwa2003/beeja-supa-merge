const { supabaseAdmin } = require('../config/supabaseAdmin');
const sharp = require('sharp');
const { getBucketForFileType, validateFile } = require('../config/supabaseStorage');
const { uploadVideoInChunks } = require('./chunkedVideoUploader');
const path = require('path');
const crypto = require('crypto');

// Image processing configuration
const IMAGE_CONFIG = {
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 85,
    format: 'jpeg',
    maxFileSize: 10 * 1024 * 1024 // 10MB
};

// Video chunking configuration for Supabase free tier
const VIDEO_CONFIG = {
    chunkThreshold: 50 * 1024 * 1024, // 50MB - files larger than this will be chunked (Supabase free tier limit)
    maxDirectUploadSize: 50 * 1024 * 1024 // 50MB - maximum size for direct upload (Supabase free tier limit)
};

/**
 * Generate a unique filename
 */
const generateUniqueFilename = (originalName, folder = '') => {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const extension = path.extname(originalName).toLowerCase();
    const baseName = path.basename(originalName, extension).replace(/[^a-zA-Z0-9]/g, '_');
    
    const filename = `${baseName}_${timestamp}_${randomString}${extension}`;
    
    return folder ? `${folder}/${filename}` : filename;
};

/**
 * Process image with Sharp (same as Cloudinary version)
 */
const processImage = async (fileBuffer, options = {}) => {
    try {
        const {
            maxWidth = IMAGE_CONFIG.maxWidth,
            maxHeight = IMAGE_CONFIG.maxHeight,
            quality = IMAGE_CONFIG.quality,
            format = IMAGE_CONFIG.format
        } = options;

        console.log('🖼️ Processing image with Sharp...');
        
        const sharpInstance = sharp(fileBuffer, {
            limitInputPixels: false,
            sequentialRead: true,
            density: 72
        });
        
        const metadata = await sharpInstance.metadata();
        console.log('Original image metadata:', {
            width: metadata.width,
            height: metadata.height,
            format: metadata.format,
            size: fileBuffer.length
        });

        const needsResize = metadata.width > maxWidth || metadata.height > maxHeight;
        
        let processedBuffer;
        
        if (needsResize) {
            console.log(`Resizing image from ${metadata.width}x${metadata.height} to fit within ${maxWidth}x${maxHeight}`);
            
            processedBuffer = await sharpInstance
                .resize(maxWidth, maxHeight, {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                .jpeg({ 
                    quality,
                    progressive: true,
                    mozjpeg: true
                })
                .toBuffer();
        } else {
            console.log('Optimizing image without resizing');
            processedBuffer = await sharpInstance
                .jpeg({ 
                    quality,
                    progressive: true,
                    mozjpeg: true
                })
                .toBuffer();
        }

        console.log('✅ Image processed successfully:', {
            originalSize: fileBuffer.length,
            processedSize: processedBuffer.length,
            compressionRatio: ((fileBuffer.length - processedBuffer.length) / fileBuffer.length * 100).toFixed(2) + '%'
        });

        return processedBuffer;
    } catch (error) {
        console.error('Error processing image:', error);
        throw new Error(`Image processing failed: ${error.message}`);
    }
};

/**
 * Upload file to Supabase Storage with automatic chunking for large videos
 * This replaces uploadImageToCloudinary function
 */
const uploadFileToSupabase = async (file, folder = '', options = {}) => {
    try {
        console.log('🔧 Starting file upload to Supabase Storage');
        console.log('File details:', {
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            sizeInMB: (file.size / (1024 * 1024)).toFixed(2) + 'MB'
        });

        // Validate buffer
        if (!file.buffer || !Buffer.isBuffer(file.buffer)) {
            throw new Error('Invalid file buffer');
        }

        // Determine the appropriate bucket
        const bucket = getBucketForFileType(file.mimetype, folder);
        console.log(`📁 Using bucket: ${bucket}`);

        // Check if it's a video and if it needs chunked upload
        const isVideo = file.mimetype.startsWith('video/');
        const isLargeVideo = isVideo && file.size > VIDEO_CONFIG.chunkThreshold;

        if (isLargeVideo) {
            console.log('🎬 Large video detected, using chunked upload...');
            
            // Use chunked upload for large videos
            const result = await uploadVideoInChunks(file, folder);
            
            console.log('✅ Chunked video upload successful:', {
                secure_url: result.secure_url,
                public_id: result.public_id,
                bucket: result.bucket,
                size: result.size
            });

            return result;
        }

        // For non-videos or small videos, use regular upload
        console.log('📤 Using regular upload...');

        // Validate file for regular upload
        const validation = validateFile(file, bucket);
        if (!validation.isValid) {
            throw new Error(`File validation failed: ${validation.errors.join(', ')}`);
        }

        // Generate unique filename
        const filename = generateUniqueFilename(file.originalname, folder);
        console.log(`📝 Generated filename: ${filename}`);

        let fileBuffer = file.buffer;

        // Process images if needed
        const isImage = file.mimetype.startsWith('image/');
        if (isImage && options.processImage !== false) {
            try {
                fileBuffer = await processImage(file.buffer, options);
                console.log('✅ Image processed successfully');
            } catch (processError) {
                console.warn('⚠️ Image processing failed, using original:', processError.message);
                fileBuffer = file.buffer;
            }
        }

        // Upload to Supabase Storage
        console.log(`📤 Uploading to Supabase Storage...`);
        const { data, error } = await supabaseAdmin.storage
            .from(bucket)
            .upload(filename, fileBuffer, {
                contentType: file.mimetype,
                cacheControl: '3600',
                upsert: false // Don't overwrite existing files
            });

        if (error) {
            console.error('Supabase upload error:', error);
            throw new Error(`Upload failed: ${error.message}`);
        }

        // Get public URL
        const { data: urlData } = supabaseAdmin.storage
            .from(bucket)
            .getPublicUrl(filename);

        const result = {
            secure_url: urlData.publicUrl,
            public_id: filename,
            format: path.extname(file.originalname).substring(1),
            resource_type: isImage ? 'image' : file.mimetype.startsWith('video/') ? 'video' : 'raw',
            bucket: bucket,
            path: data.path,
            fullPath: data.fullPath,
            size: fileBuffer.length,
            original_filename: file.originalname
        };

        console.log('✅ Upload successful:', {
            secure_url: result.secure_url,
            public_id: result.public_id,
            bucket: result.bucket,
            size: result.size
        });

        return result;

    } catch (error) {
        console.error("Error while uploading file to Supabase:", error);
        throw new Error(`Failed to upload file: ${error.message}`);
    }
};

/**
 * Upload image to Supabase (replaces uploadImageToCloudinary)
 */
const uploadImageToSupabase = async (file, folder, height, quality) => {
    const options = {};
    
    if (height) {
        options.maxHeight = height;
        options.maxWidth = height; // Maintain aspect ratio
    }
    
    if (quality) {
        options.quality = quality;
    }

    return uploadFileToSupabase(file, folder, options);
};

/**
 * Upload resume/document to Supabase (replaces uploadResumeToCloudinary)
 */
const uploadResumeToSupabase = async (file, folder, height, quality) => {
    // For documents, we don't process them, just upload as-is
    const options = {
        processImage: false // Don't process documents
    };

    return uploadFileToSupabase(file, folder, options);
};

/**
 * Delete file from Supabase Storage (replaces deleteResourceFromCloudinary)
 */
const deleteFileFromSupabase = async (url) => {
    if (!url) return null;

    try {
        console.log(`🗑️ Attempting to delete file: ${url}`);

        // Extract bucket and path from Supabase URL
        // URL format: https://[project-ref].supabase.co/storage/v1/object/public/[bucket]/[path]
        const urlParts = url.split('/storage/v1/object/public/');
        if (urlParts.length !== 2) {
            console.warn('Invalid Supabase URL format, skipping deletion');
            return null;
        }

        const [bucket, ...pathParts] = urlParts[1].split('/');
        const filePath = pathParts.join('/');

        console.log(`📁 Deleting from bucket: ${bucket}, path: ${filePath}`);

        const { data, error } = await supabaseAdmin.storage
            .from(bucket)
            .remove([filePath]);

        if (error) {
            console.error(`Error deleting file from Supabase:`, error);
            return null;
        }

        console.log(`✅ Successfully deleted file: ${filePath}`);
        return data;

    } catch (error) {
        console.error(`Error deleting file with URL ${url}:`, error);
        // Don't throw error to prevent operations from failing
        console.log('Continuing despite file deletion failure');
        return null;
    }
};

/**
 * Get signed URL for private files (replaces generateSignedUrl)
 */
const getSignedUrl = async (bucket, filePath, expiresIn = 3600) => {
    try {
        const { data, error } = await supabaseAdmin.storage
            .from(bucket)
            .createSignedUrl(filePath, expiresIn);

        if (error) {
            console.error('Error generating signed URL:', error);
            return null;
        }

        console.log('Generated signed URL for:', filePath);
        return data.signedUrl;
    } catch (error) {
        console.error('Error generating signed URL:', error);
        return null;
    }
};

/**
 * Get public URL for files
 */
const getPublicUrl = (bucket, filePath) => {
    try {
        const { data } = supabaseAdmin.storage
            .from(bucket)
            .getPublicUrl(filePath);

        return data.publicUrl;
    } catch (error) {
        console.error('Error getting public URL:', error);
        return null;
    }
};

/**
 * List files in a bucket
 */
const listFiles = async (bucket, folder = '', limit = 100) => {
    try {
        const { data, error } = await supabaseAdmin.storage
            .from(bucket)
            .list(folder, {
                limit: limit,
                offset: 0
            });

        if (error) {
            console.error('Error listing files:', error);
            return [];
        }

        return data;
    } catch (error) {
        console.error('Error listing files:', error);
        return [];
    }
};

module.exports = {
    uploadFileToSupabase,
    uploadImageToSupabase,
    uploadResumeToSupabase,
    deleteFileFromSupabase,
    getSignedUrl,
    getPublicUrl,
    listFiles,
    processImage,
    generateUniqueFilename,
    VIDEO_CONFIG
};
