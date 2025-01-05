const mongoose = require('mongoose');
const createModel = require('../modules/createModel');

exports.index = async (req, res) => {
    const model = await createModel('myapp-themes');
    const settings = await model.findOne({brand: 'hubb'}).lean();
    res.render('index', {
        data: {
            settings,
            siginURL: process.env.SIGNIN_URL,
        }
    });
};