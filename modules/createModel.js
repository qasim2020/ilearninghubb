const mongoose = require( 'mongoose' );
const Collections = require ('../models/collections.js');

createModel = async function(modelName) {
    try {
        if (mongoose.connection.readyState !== 1) {
            console.log('MongoDB connection not ready. Using fallback model.');
            return createFallbackModel(modelName);
        }

        let modelExistsAlready = Object.keys(mongoose.models).some(val => val == modelName);
        let schemaExistsAlready = mongoose.modelSchemas && Object.keys(mongoose.modelSchemas).some(val => val == modelName);
        
        if (modelExistsAlready || schemaExistsAlready) { 
            console.log(`Using existing model: ${modelName}`);
            return mongoose.models[modelName];
        }
        
        if (modelExistsAlready) { delete mongoose.models[modelName]; }
        if (schemaExistsAlready) { delete mongoose.modelSchemas[modelName]; }
        
        return createFallbackModel(modelName);
    } catch(e) {
        console.error(`Failed to create Model ${modelName}:`, e);
        return createFallbackModel(modelName);
    }
};

function createFallbackModel(modelName) {
    if (mongoose.models[modelName]) {
        return mongoose.models[modelName];
    }
    
    return mongoose.model(modelName, new mongoose.Schema({
        brand: String,
        properties: Object
    }, { timestamps: { createdAt: 'created_at' } }));
}

module.exports = createModel; 