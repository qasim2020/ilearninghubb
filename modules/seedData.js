const mongoose = require('mongoose');
const Collections = require('../models/collections');
const connectDB = require('../config/db')

const seedDatabase = async () => {
    try {
        // Check if MongoDB is connected
        if (!connectDB) {
            console.log('Cannot seed database: MongoDB not connected');
            return; 
        }

        console.log('Checking for existing theme collection...');
        
        // Check if we already have a themes collection
        let existingTheme;
        try {
            existingTheme = await Collections.findOne({ name: 'myapp-themes' });
            console.log(existingTheme);
        } catch (err) {
            console.error('Error checking for existing theme:', err);
            return;
        }
        
        if (!existingTheme) {
            console.log('Seeding database with initial theme data...');
            
            try {
                // Create a themes collection
                const themeCollection = new Collections({
                    name: 'myapp-themes',
                    brand: 'hubb',
                    properties: {
                        brand: {
                            type: String,
                            required: true
                        },
                        colors: {
                            type: Object,
                            required: false
                        },
                        fonts: {
                            type: Object,
                            required: false
                        },
                        logo: {
                            type: String,
                            required: false
                        },
                        favicon: {
                            type: String,
                            required: false
                        },
                        header: {
                            type: Object,
                            required: false
                        },
                        footer: {
                            type: Object,
                            required: false
                        }
                    }
                });
                
                await themeCollection.save();
                console.log('Theme collection created successfully');
                
                // Now create a model for myapp-themes using the same mongoose connection
                let ThemeModel;
                try {
                    ThemeModel = mongoose.model('myapp-themes');
                } catch (e) {
                    console.log('Creating new ThemeModel');
                    ThemeModel = mongoose.model('myapp-themes', 
                        new mongoose.Schema(themeCollection.properties, { timestamps: { createdAt: 'created_at' } })
                    );
                }
                
                // Create a default theme
                const defaultTheme = new ThemeModel({
                    brand: 'hubb',
                    colors: {
                        primary: '#4CAF50',
                        secondary: '#2196F3',
                        accent: '#FF9800',
                        background: '#FFFFFF',
                        text: '#333333'
                    },
                    fonts: {
                        heading: 'Poppins, sans-serif',
                        body: 'Roboto, sans-serif'
                    },
                    logo: 'kidscamp/assets/images/logo.png',
                    favicon: 'kidscamp/assets/images/favicon.ico',
                    header: {
                        style: 'default',
                        sticky: true,
                        transparent: false
                    },
                    footer: {
                        style: 'default',
                        columns: 3
                    }
                });
                
                await defaultTheme.save();
                console.log('Default theme created successfully');
            } catch (err) {
                console.error('Error creating seed data:', err);
            }
        } else {
            console.log('Theme collection already exists, skipping seed');
        }
    } catch (error) {
        console.error('Error in seed database function:', error);
    }
};

module.exports = seedDatabase; 