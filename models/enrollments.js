const mongoose = require('mongoose');

let schema = {
    participantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'participants',
        required: true,
    },
    bootcampId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'bootcamps',
        required: true,
    },
    enrollmentDate: {
        type: Date,
        default: Date.now,
    },
    status: {
        type: String,
        enum: ['enrolled', 'completed', 'cancelled'],
        default: 'enrolled',
    },
};

let Enrollments = mongoose.model('enrollments', new mongoose.Schema(schema, { timestamps: true }));

module.exports = Enrollments;
