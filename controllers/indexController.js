const mongoose = require('mongoose');
const createModel = require('../modules/createModel');
const { renderPage } = require('./controllerUtils');
const { getBrandData } = require('../modules/brandCollectionModules');

/**
 * Index/Home page controller
 */
exports.index = async (req, res) => {
    console.log('rendering index');
    await renderPage(req, res, 'index');
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