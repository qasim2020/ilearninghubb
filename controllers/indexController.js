const mongoose = require('mongoose');
const createModel = require('../modules/createModel');
const { renderPage } = require('./controllerUtils');
const { getBrandData } = require('../modules/brandCollectionModules');
const Event = require('../models/events');

exports.index = async (req, res) => {
    try {
        
        const recentEvents = await Event.find({ featured: true })
            .sort({ date: -1 })
            .limit(3)
            .lean();

        return res.render('index', {});

    } catch (error) {
        console.error('Error in index controller:', error);
        await renderPage(req, res, 'index', {});
    }
};