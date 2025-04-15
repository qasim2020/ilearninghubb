const mongoose = require('mongoose');

let schema = {
    bootcampId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'bootcamps',
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: false,
    },
    schedule: {
        date: {
            type: Date,
            required: true,
        },
        startTime: {
            type: String,
            required: true,
        },
        endTime: {
            type: String,
            required: true,
        },
    },
};

let Activities = mongoose.model('activities', new mongoose.Schema(schema, { timestamps: true }));

module.exports = Activities;
