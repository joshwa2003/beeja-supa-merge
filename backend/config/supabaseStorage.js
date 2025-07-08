const supabase = require('./supabase');

// Storage bucket configuration
const STORAGE_BUCKETS = {
    IMAGES: 'images',
    VIDEOS: 'videos', 
    DOCUMENTS: 'documents',
    PROFILES: 'profiles',
    COURSES: 'courses',
    CHAT: 'chat-files'
};

// File size limits (in bytes)
const FILE_SIZE_LIMITS = {
    IMAGE: 10 * 1024 * 1024,    // 10MB
    VIDEO: 100 * 1024 * 1024,   // 100MB (Supabase free tier limit)
    DOCUMENT: 50 * 1024 * 1024, // 50MB
    PROFILE: 5 * 1024 * 1024    // 5MB
};

// Allowed file types
const ALLOWED_FILE_TYPES = {
    IMAGES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    VIDEOS: ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov'],
    DOCUMENTS: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
};

/**
 * Initialize storage buckets if they don't exist
 */
const initializeStorageBuckets = async () => {
    try {
        console.log('🗄️ Initializing Supabase storage buckets...');
        
        // Get existing buckets
        const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
        
        if (listError) {
            console.error('❌ Error listing buckets:', listError);
            console.log('⚠️  Please ensure your Supabase service role key has proper permissions');
            console.log('📋 Manual bucket creation required. See SUPABASE_MIGRATION.md for instructions');
            return;
        }

        const existingBucketNames = existingBuckets.map(bucket => bucket.name);
        console.log('📋 Existing buckets:', existingBucketNames);
        
        let bucketsCreated = 0;
        let bucketsExisted = 0;
        let bucketsFailed = 0;
        
        // Create missing buckets
        for (const [key, bucketName] of Object.entries(STORAGE_BUCKETS)) {
            if (!existingBucketNames.includes(bucketName)) {
                console.log(`📁 Creating bucket: ${bucketName}`);
                
                try {
                    const { data, error } = await supabase.storage.createBucket(bucketName, {
                        public: true, // Make buckets public for easier access
                        allowedMimeTypes: getAllowedMimeTypes(bucketName),
                        fileSizeLimit: getFileSizeLimit(bucketName)
                    });

                    if (error) {
                        console.error(`❌ Error creating bucket ${bucketName}:`, error.message);
                        bucketsFailed++;
                        
                        // Provide specific guidance for common errors
                        if (error.message.includes('row-level security policy')) {
                            console.log(`💡 RLS Policy Error: Please create bucket '${bucketName}' manually in Supabase Dashboard`);
                        } else if (error.message.includes('maximum allowed size')) {
                            console.log(`💡 Size Error: Please adjust file size limits for bucket '${bucketName}'`);
                        }
                    } else {
                        console.log(`✅ Created bucket: ${bucketName}`);
                        bucketsCreated++;
                    }
                } catch (createError) {
                    console.error(`❌ Failed to create bucket ${bucketName}:`, createError.message);
                    bucketsFailed++;
                }
            } else {
                console.log(`✅ Bucket already exists: ${bucketName}`);
                bucketsExisted++;
            }
        }
        
        // Summary
        console.log('\n📊 BUCKET INITIALIZATION SUMMARY:');
        console.log(`   ✅ Existing buckets: ${bucketsExisted}`);
        console.log(`   🆕 Created buckets: ${bucketsCreated}`);
        console.log(`   ❌ Failed buckets: ${bucketsFailed}`);
        
        if (bucketsFailed > 0) {
            console.log('\n⚠️  MANUAL ACTION REQUIRED:');
            console.log('   Some buckets failed to create automatically.');
            console.log('   Please create them manually in your Supabase Dashboard:');
            console.log('   1. Go to Storage in your Supabase project');
            console.log('   2. Create the following buckets as PUBLIC:');
            
            for (const [key, bucketName] of Object.entries(STORAGE_BUCKETS)) {
                if (!existingBucketNames.includes(bucketName)) {
                    console.log(`      - ${bucketName}`);
                }
            }
            
            console.log('\n   3. Set appropriate file size limits and MIME types');
            console.log('   4. Restart the server after creating buckets');
            console.log('\n   📖 See SUPABASE_MIGRATION.md for detailed instructions');
        } else {
            console.log('\n🎉 All storage buckets are ready!');
        }
        
        console.log('🗄️ Storage buckets initialization completed');
    } catch (error) {
        console.error('❌ Error initializing storage buckets:', error);
        console.log('\n⚠️  FALLBACK MODE ACTIVATED:');
        console.log('   - File uploads will use Cloudinary as fallback');
        console.log('   - Please check your Supabase configuration');
        console.log('   - Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are correct');
    }
};

/**
 * Get allowed MIME types for a bucket
 */
const getAllowedMimeTypes = (bucketName) => {
    switch (bucketName) {
        case STORAGE_BUCKETS.IMAGES:
        case STORAGE_BUCKETS.PROFILES:
        case STORAGE_BUCKETS.COURSES:
        case STORAGE_BUCKETS.CHAT:
            return ALLOWED_FILE_TYPES.IMAGES;
        case STORAGE_BUCKETS.VIDEOS:
            return ALLOWED_FILE_TYPES.VIDEOS;
        case STORAGE_BUCKETS.DOCUMENTS:
            return ALLOWED_FILE_TYPES.DOCUMENTS;
        default:
            return [...ALLOWED_FILE_TYPES.IMAGES, ...ALLOWED_FILE_TYPES.VIDEOS, ...ALLOWED_FILE_TYPES.DOCUMENTS];
    }
};

/**
 * Get file size limit for a bucket
 */
const getFileSizeLimit = (bucketName) => {
    switch (bucketName) {
        case STORAGE_BUCKETS.VIDEOS:
            return FILE_SIZE_LIMITS.VIDEO;
        case STORAGE_BUCKETS.DOCUMENTS:
            return FILE_SIZE_LIMITS.DOCUMENT;
        case STORAGE_BUCKETS.PROFILES:
            return FILE_SIZE_LIMITS.PROFILE;
        default:
            return FILE_SIZE_LIMITS.IMAGE;
    }
};

/**
 * Get the appropriate bucket for a file type
 */
const getBucketForFileType = (mimetype, folder = '') => {
    // Check if it's a video
    if (ALLOWED_FILE_TYPES.VIDEOS.includes(mimetype)) {
        return STORAGE_BUCKETS.VIDEOS;
    }
    
    // Check if it's a document
    if (ALLOWED_FILE_TYPES.DOCUMENTS.includes(mimetype)) {
        return STORAGE_BUCKETS.DOCUMENTS;
    }
    
    // Check if it's an image and determine bucket based on folder
    if (ALLOWED_FILE_TYPES.IMAGES.includes(mimetype)) {
        if (folder && folder.includes('profile')) {
            return STORAGE_BUCKETS.PROFILES;
        }
        if (folder && folder.includes('course')) {
            return STORAGE_BUCKETS.COURSES;
        }
        if (folder && folder.includes('chat')) {
            return STORAGE_BUCKETS.CHAT;
        }
        return STORAGE_BUCKETS.IMAGES;
    }
    
    // Default to images bucket
    return STORAGE_BUCKETS.IMAGES;
};

/**
 * Validate file type and size
 */
const validateFile = (file, bucket) => {
    const errors = [];
    
    // Check file size
    const sizeLimit = getFileSizeLimit(bucket);
    if (file.size > sizeLimit) {
        errors.push(`File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds limit (${(sizeLimit / 1024 / 1024).toFixed(2)}MB)`);
    }
    
    // Check file type
    const allowedTypes = getAllowedMimeTypes(bucket);
    if (!allowedTypes.includes(file.mimetype)) {
        errors.push(`File type ${file.mimetype} is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

module.exports = {
    STORAGE_BUCKETS,
    FILE_SIZE_LIMITS,
    ALLOWED_FILE_TYPES,
    initializeStorageBuckets,
    getBucketForFileType,
    validateFile,
    getAllowedMimeTypes,
    getFileSizeLimit
};
