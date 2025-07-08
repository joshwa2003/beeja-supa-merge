const mongoose = require('mongoose')

const courseSchema = new mongoose.Schema({
    courseName: {
        type: String
    },
    isVisible: {
        type: Boolean,
        default: true,
    },
    isDeactivated: {
        type: Boolean,
        default: false,
    },
    courseType: {
        type: String,
        enum: ['Paid', 'Free'],
        default: 'Paid'
    },
    adminSetFree: {
        type: Boolean,
        default: false
    },
    originalPrice: {
        type: Number
    },
    courseDescription: {
        type: String
    },
    instructor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    whatYouWillLearn: {
        type: String
    },
    courseContent: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Section'
        }
    ],
    ratingAndReviews: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'RatingAndReview'
        }
    ],
    price: {
        type: Number
    },
    thumbnail: {
        type: String
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    },
    tag: {
        type: [String],
        required: true
    },
    studentsEnrolled: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        }
    ],
    instructions: {
        type: [String]
    },
    status: {
        type: String,
        enum: ['Draft', 'Published']
    },
    createdAt: {
        type: Date,
    }
    ,
    updatedAt: {
        type: Date,
    }

});

module.exports = mongoose.models.Course || mongoose.model('Course', courseSchema);
