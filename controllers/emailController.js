const mongoose = require('mongoose');
const createModel = require('../modules/createModel');
const { renderPage } = require('./controllerUtils');
const { getBrandData } = require('../modules/brandCollectionModules');
const Event = require('../models/events');

exports.sendMail = async (req, res) => {
    const { username, email, phone, service, message } = req.body;

    if (!username || !email || !message) {
        return res.redirect('/contact.html?message=missing');
    }

};