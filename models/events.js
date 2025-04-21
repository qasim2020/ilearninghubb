const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Event Schema
 * This schema defines the structure for educational events displayed on the platform
 */
const eventSchema = new Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    extendedDescription: {
        type: String,
        default: ''
    },
    date: {
        type: Date,
        required: true
    },
    location: {
        type: String,
        default: 'iLearningHubb Campus'
    },
    startTime: {
        type: String,
        default: '10:00 AM'
    },
    endTime: {
        type: String,
        default: '3:00 PM'
    },
    imageUrl: {
        type: String,
        required: true
    },
    videoUrl: {
        type: String,
        default: ''
    },
    additionalVideos: {
        type: [{
            title: String,
            url: String,
            thumbnailUrl: String
        }],
        default: []
    },
    ageRange: {
        type: String,
        required: true
    },
    featured: {
        type: Boolean,
        default: false
    },
    tags: {
        type: [String],
        default: ['Education', 'Activities', 'Learning']
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt field on save
eventSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Event', eventSchema); 