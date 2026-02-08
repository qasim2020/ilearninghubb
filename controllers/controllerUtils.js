const Settings = require('../models/Settings');

const getSettings = async () => {
    try {
        const settings = await Settings.findOne({ key: 'main' }).lean();
        return settings || {};
    } catch (err) {
        console.error('Error Fetching data:', err);
        return {};
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
            },
            settings,
            siginURL: process.env.SIGNIN_URL,
            page: template,
            ...additionalData
        };

        if (statusCode !== 200) {
            return res.status(statusCode).render(template, responseData);
        }
        
        res.render(template, responseData);
    } catch (err) {
        console.error(`Error rendering ${template}:`, err);
        res.status(500).render('error', {
            data: {
                settings: {},
                siginURL: process.env.SIGNIN_URL,
                page: 'error',
                error: process.env.NODE_ENV === 'production' ? 'An error occurred' : err.message
            },
            settings: {},
            siginURL: process.env.SIGNIN_URL,
            page: 'error',
            error: process.env.NODE_ENV === 'production' ? 'An error occurred' : err.message
        });
    }
};

module.exports = {
    getSettings,
    renderPage
}; 