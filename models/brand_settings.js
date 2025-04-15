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
    socialLinks: {
        facebook: { type: String },
        instagram: { type: String },
        twitter: { type: String },
        youtube: { type: String },
    },
};

let BrandSettings = mongoose.model('brand_settings', new mongoose.Schema(schema, { timestamps: true }));

module.exports = BrandSettings;
