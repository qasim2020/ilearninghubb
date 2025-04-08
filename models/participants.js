const mongoose = require('mongoose');

let schema = {
    firstName: {
        type: String,
        required: true,
    },
    lastName: {
        type: String,
        required: true,
    },
    dateOfBirth: {
        type: Date,
        required: true,
    },
    guardian: {
        name: {
            type: String,
            required: true,
        },
        contactNumber: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
        },
    },
    medicalInfo: {
        type: String,
        required: false,
    },
    emergencyContact: {
        name: {
            type: String,
            required: true,
        },
        contactNumber: {
            type: String,
            required: true,
        },
    },
};

let Participants = mongoose.model('participants', new mongoose.Schema(schema, { timestamps: true }));

module.exports = Participants;
