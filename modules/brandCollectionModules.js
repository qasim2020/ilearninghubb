const Settings = require('../models/Settings');

const getBrandData = async () => {
    const data = await Settings.findOne({ key: 'main' }).lean();
    return data || {};
}

module.exports = {
    getBrandData,
};
