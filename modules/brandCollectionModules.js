const BrandSettings = require('../models/brand_settings');

const getBrandData = async () => {
    const data = await BrandSettings.findOne({}, {sort: {_id: -1}}).lean();
    return data;
}

module.exports = {
    getBrandData,
};
