const RecycleBin = require('../models/recycleBin');
const Course = require('../models/course');
const User = require('../models/user');
const Category = require('../models/category');

// Get all items in recycle bin
exports.getRecycleBinItems = async (req, res) => {
    try {
        const { itemType, page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;
        
        let filter = {};
        if (itemType && ['User', 'Course', 'Category'].includes(itemType)) {
            filter.itemType = itemType;
        }

        const items = await RecycleBin.find(filter)
            .populate('deletedBy', 'firstName lastName email')
            .sort({ deletedAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await RecycleBin.countDocuments(filter);

        return res.status(200).json({
            success: true,
            data: items,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                hasNext: page * limit < total,
                hasPrev: page > 1
            }
        });
    } catch (error) {
        console.error('Error fetching recycle bin items:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching recycle bin items',
            error: error.message
        });
    }
};

// Move item to recycle bin (soft delete)
exports.moveToRecycleBin = async (req, res) => {
    try {
        const { itemType, itemId, reason = '' } = req.body;
        const deletedBy = req.user.id;

        if (!['User', 'Course', 'Category'].includes(itemType)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid item type'
            });
        }

        let originalData;
        let Model;

        // Get the original data based on item type
        switch (itemType) {
            case 'Course':
                Model = Course;
                originalData = await Course.findById(itemId)
                    .populate('instructor', 'firstName lastName email')
                    .populate('category', 'name')
                    .populate('studentsEnrolled', 'firstName lastName email');
                break;
            case 'User':
                Model = User;
                originalData = await User.findById(itemId)
                    .populate('additionalDetails')
                    .populate('courses', 'courseName');
                break;
            case 'Category':
                Model = Category;
                originalData = await Category.findById(itemId)
                    .populate('courses', 'courseName');
                break;
        }

        if (!originalData) {
            return res.status(404).json({
                success: false,
                message: `${itemType} not found`
            });
        }

        // Create recycle bin entry
        const recycleBinItem = await RecycleBin.create({
            itemType,
            originalId: itemId,
            originalData: originalData.toObject(),
            deletedBy,
            reason
        });

        // Soft delete the original item (mark as inactive/hidden)
        switch (itemType) {
            case 'Course':
                await Course.findByIdAndUpdate(itemId, { 
                    status: 'Draft',
                    isVisible: false,
                    isDeactivated: true  // Add this flag for student UI
                });
                break;
            case 'User':
                await User.findByIdAndUpdate(itemId, { 
                    active: false 
                });
                break;
            case 'Category':
                // For categories, we'll just mark them in recycle bin
                // The actual deletion logic can be handled separately
                break;
        }

        const populatedItem = await RecycleBin.findById(recycleBinItem._id)
            .populate('deletedBy', 'firstName lastName email');

        return res.status(200).json({
            success: true,
            message: `${itemType} moved to recycle bin successfully`,
            data: populatedItem
        });
    } catch (error) {
        console.error('Error moving item to recycle bin:', error);
        return res.status(500).json({
            success: false,
            message: 'Error moving item to recycle bin',
            error: error.message
        });
    }
};

// Restore item from recycle bin
exports.restoreFromRecycleBin = async (req, res) => {
    try {
        const { recycleBinId } = req.params;

        const recycleBinItem = await RecycleBin.findById(recycleBinId);
        if (!recycleBinItem) {
            return res.status(404).json({
                success: false,
                message: 'Item not found in recycle bin'
            });
        }

        const { itemType, originalId, originalData } = recycleBinItem;

        // Restore the item based on type
        switch (itemType) {
            case 'Course':
                await Course.findByIdAndUpdate(originalId, {
                    status: 'Published',
                    isVisible: true,
                    isDeactivated: false  // Remove deactivation flag
                });
                break;
            case 'User':
                await User.findByIdAndUpdate(originalId, {
                    active: true
                });
                break;
            case 'Category':
                // Restore category if it was soft deleted
                // Implementation depends on how categories are handled
                break;
        }

        // Remove from recycle bin
        await RecycleBin.findByIdAndDelete(recycleBinId);

        return res.status(200).json({
            success: true,
            message: `${itemType} restored successfully`
        });
    } catch (error) {
        console.error('Error restoring item from recycle bin:', error);
        return res.status(500).json({
            success: false,
            message: 'Error restoring item from recycle bin',
            error: error.message
        });
    }
};

// Permanently delete item from recycle bin
exports.permanentlyDelete = async (req, res) => {
    try {
        const { recycleBinId } = req.params;

        const recycleBinItem = await RecycleBin.findById(recycleBinId);
        if (!recycleBinItem) {
            return res.status(404).json({
                success: false,
                message: 'Item not found in recycle bin'
            });
        }

        const { itemType, originalId } = recycleBinItem;

        // Permanently delete the original item
        switch (itemType) {
            case 'Course':
                await Course.findByIdAndDelete(originalId);
                break;
            case 'User':
                await User.findByIdAndDelete(originalId);
                break;
            case 'Category':
                await Category.findByIdAndDelete(originalId);
                break;
        }

        // Remove from recycle bin
        await RecycleBin.findByIdAndDelete(recycleBinId);

        return res.status(200).json({
            success: true,
            message: `${itemType} permanently deleted`
        });
    } catch (error) {
        console.error('Error permanently deleting item:', error);
        return res.status(500).json({
            success: false,
            message: 'Error permanently deleting item',
            error: error.message
        });
    }
};

// Get recycle bin statistics
exports.getRecycleBinStats = async (req, res) => {
    try {
        const stats = await RecycleBin.aggregate([
            {
                $group: {
                    _id: '$itemType',
                    count: { $sum: 1 },
                    oldestItem: { $min: '$deletedAt' },
                    newestItem: { $max: '$deletedAt' }
                }
            }
        ]);

        const totalItems = await RecycleBin.countDocuments();

        return res.status(200).json({
            success: true,
            data: {
                totalItems,
                itemsByType: stats
            }
        });
    } catch (error) {
        console.error('Error fetching recycle bin stats:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching recycle bin statistics',
            error: error.message
        });
    }
};

// Clean up expired items (can be called by cron job)
exports.cleanupExpiredItems = async (req, res) => {
    try {
        const expiredItems = await RecycleBin.find({
            expiresAt: { $lte: new Date() }
        });

        for (const item of expiredItems) {
            // Permanently delete the original item
            switch (item.itemType) {
                case 'Course':
                    await Course.findByIdAndDelete(item.originalId);
                    break;
                case 'User':
                    await User.findByIdAndDelete(item.originalId);
                    break;
                case 'Category':
                    await Category.findByIdAndDelete(item.originalId);
                    break;
            }
        }

        // MongoDB TTL index should automatically remove expired documents
        // But we can also manually clean them up
        const deletedCount = await RecycleBin.deleteMany({
            expiresAt: { $lte: new Date() }
        });

        return res.status(200).json({
            success: true,
            message: `Cleaned up ${deletedCount.deletedCount} expired items`
        });
    } catch (error) {
        console.error('Error cleaning up expired items:', error);
        return res.status(500).json({
            success: false,
            message: 'Error cleaning up expired items',
            error: error.message
        });
    }
};
