const mongoose = require('mongoose');
const createModel = require('../modules/createModel');
const { renderPage } = require('./controllerUtils');
const { getBrandData } = require('../modules/brandCollectionModules');
const Event = require('../models/events');

/**
 * Index/Home page controller
 */
exports.index = async (req, res) => {
    try {
        // Fetch the 3 most recent featured events
        const recentEvents = await Event.find({ featured: true })
            .sort({ date: -1 })
            .limit(3)
            .lean();

        await renderPage(req, res, 'index', { recentEvents });
    } catch (error) {
        console.error('Error in index controller:', error);
        await renderPage(req, res, 'index', {});
    }
};

exports.landingPage = async (req,res) => {
    try {
        const brandSettings = await getBrandData();
        res.render('index',{
            layout: 'main',
            brandSettings,
        });
    } catch (error) {
        console.log(error);
        res.status(400).send(error.message);
    }
}