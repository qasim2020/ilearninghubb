const mongoose = require('mongoose');

let schema = {
    name: {
        type: "String",
        required: true,
    },
    brand: {
        type: "String",
        required: true,
    },
    redirect: {
        type: "String",
        required: false
    },
    properties: {
        type: "Object",
        required: true,
    },
    airtable: {
        type: "Object",
        required: false
    }
};

let Collections = mongoose.model('collections', new mongoose.Schema(schema));

module.exports = Collections;