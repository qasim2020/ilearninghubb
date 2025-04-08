const mongoose = require('mongoose');

let schema = {
    name: {
        type: String,
        required: true,
    },
    logoUrl: {
        type: String,
        required: false,
    },
    primaryColor: {
        type: String,
        required: false,
    },
    secondaryColor: {
        type: String,
        required: false,
    },
    fonts: {
        heading: {
            type: String,
            required: false,
        },
        body: {
            type: String,
            required: false,
        },
    },
    footerText: {
        type: String,
        required: false,
    },
    socialLinks: {
        facebook: { type: String },
        instagram: { type: String },
        twitter: { type: String },
        youtube: { type: String },
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    airtable: {
        type: Object,
        required: false,
    },
};

let BrandSettings = mongoose.model('brand_settings', new mongoose.Schema(schema, { timestamps: true }));

module.exports = BrandSettings;
