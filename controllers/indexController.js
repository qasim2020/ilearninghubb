const mongoose = require('mongoose');
const createModel = require('../modules/createModel');
const { renderPage } = require('./controllerUtils');

/**
 * Index/Home page controller
 */
exports.index = async (req, res) => {
    await renderPage(req, res, 'index');
};