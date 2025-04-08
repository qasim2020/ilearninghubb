const mongoose = require('mongoose');

let schema = {
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    startDate: {
        type: Date,
        required: true,
    },
    endDate: {
        type: Date,
        required: true,
    },
    location: {
        type: String,
        required: true,
    },
    capacity: {
        type: Number,
        required: true,
    },
    instructors: [
        {
            name: {
                type: String,
                required: true,
            },
            bio: {
                type: String,
                required: false,
            },
            contact: {
                type: String,
                required: false,
            },
        },
    ],
};

let Bootcamps = mongoose.model('bootcamps', new mongoose.Schema(schema, { timestamps: true }));

module.exports = Bootcamps;
