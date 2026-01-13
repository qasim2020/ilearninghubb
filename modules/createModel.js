const mongoose = require('mongoose');
const Collections = require('../models/collections.js');

createModel = async function (modelName) {
    try {
        let modelExistsAlready = Object.keys(mongoose.models).some(val => val == modelName);
        let schemaExistsAlready = mongoose.modelSchemas && Object.keys(mongoose.modelSchemas).some(val => val == modelName);
        if (modelExistsAlready || schemaExistsAlready) { return mongoose.models[modelName] };
        if (modelExistsAlready) { delete mongoose.models[modelName] };
        if (schemaExistsAlready) { delete mongoose.modelSchemas[modelName] };
        let schema = await Collections.findOne({ name: modelName }).lean();
        return mongoose.models[modelName] || mongoose.model(modelName, new mongoose.Schema(schema.properties, { timestamps: { createdAt: 'created_at' } }));
    } catch (e) {
        console.log(chalk.red.bold('Failed to create Model' + ':' + modelName));
        return {
            status: 500,
            error: 'Failed to create Model' + ':' + modelName
        };
    }
};

module.exports = createModel; 