const mongoose = require( 'mongoose' );
const Collections = require ('../models/collections.js');

createModel = async function(modelName) {
    try {
        // First check if mongoose is connected
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
        
        console.log(`Looking for schema: ${modelName}`);
        let schema;
        
        try {
            schema = await Collections.findOne({name: modelName}).lean();
            console.log(`Schema search result:`, schema ? 'Found' : 'Not found');
        } catch (err) {
            console.error(`Error finding schema for ${modelName}:`, err);
            return createFallbackModel(modelName);
        }
        
        // Check if schema exists before trying to create a model
        if (!schema) {
            console.log(`Schema not found for model: ${modelName}, creating default`);
            return createFallbackModel(modelName);
        }
        
        console.log(`Creating model for ${modelName} with schema properties`);
        return mongoose.model(modelName, new mongoose.Schema(schema.properties, { timestamps: { createdAt: 'created_at' } }));
    } catch(e) {
        console.error(`Failed to create Model ${modelName}:`, e);
        return createFallbackModel(modelName);
    }
};

// Helper function to create a fallback model with default schema
function createFallbackModel(modelName) {
    console.log(`Creating fallback model for ${modelName}`);
    // Check if model already exists to avoid errors
    if (mongoose.models[modelName]) {
        return mongoose.models[modelName];
    }
    
    return mongoose.model(modelName, new mongoose.Schema({
        brand: String,
        properties: Object
    }, { timestamps: { createdAt: 'created_at' } }));
}

module.exports = createModel; 