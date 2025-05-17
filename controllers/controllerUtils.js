const mongoose = require('mongoose');
const createModel = require('../modules/createModel');
const BrandSettings = require('../models/brand_settings')

const getSettings = async () => {
    try {
        const settings = await BrandSettings.findOne({ brand: 'hubb' }).lean();
        return settings || { brand: 'hubb', properties: {} };
    } catch (err) {
        console.error('Error Fetching data:', err);
        return { brand: 'hubb', properties: {} };
    }
};

const renderPage = async (req, res, template, additionalData = {}, statusCode = 200) => {
    try {
        const settings = await getSettings();
        
        const responseData = {
            data: {
                settings,
                siginURL: process.env.SIGNIN_URL,
                page: template,
                ...additionalData
            }
        };

        if (statusCode !== 200) {
            return res.status(statusCode).render(template, responseData);
        }
        
        res.render(template, responseData);
    } catch (err) {
        console.error(`Error rendering ${template}:`, err);
        res.status(500).render('error', {
            data: {
                settings: { brand: 'hubb', properties: {} },
                siginURL: process.env.SIGNIN_URL,
                page: 'error',
                error: process.env.NODE_ENV === 'production' ? 'An error occurred' : err.message
            }
        });
    }
};

module.exports = {
    getSettings,
    renderPage
}; 