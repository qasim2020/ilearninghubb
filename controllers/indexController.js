const mongoose = require('mongoose');
const createModel = require('../modules/createModel');
const { renderPage } = require('./controllerUtils');
const { getBrandData } = require('../modules/brandCollectionModules');
const Event = require('../models/events');

exports.index = async (req, res) => {
    try {
        const model = await createModel('ilearninghubb-events');
        const events = await model.find({}).lean();

        return res.render('index', {
            events: events,
        });

    } catch (error) {
        console.error('Error in index controller:', error);
        await renderPage(req, res, 'index', {});
    }
};

exports.event = async (req, res) => {
    try {
        const slug = req.params.slug;
        const model = await createModel('ilearninghubb-events');
        const event = await model.findOne({ slug: slug }).lean();

        if (!event) {
            return res.status(404).send('Event not found');
        }

        return res.render('event', { event: event });

    } catch (error) {
        console.error('Event could not be fetched:', error);
        return res.status(500).send('Internal Server Error');
    }
};