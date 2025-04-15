const mongoose = require('./config/db');
const MongoStore = require('connect-mongo');
require('dotenv').config();
const express = require('express');
const session = require('express-session');

const path = require('path');
const exphbs = require('express-handlebars');
const fs = require('fs');

const hbsHelpers = require('./modules/helpers');

mongoose();

const app = express();
app.use(express.urlencoded({ extended: true }));
app.engine('handlebars', exphbs.engine({ helpers: hbsHelpers }));
app.set('view engine', 'handlebars');
app.use(
    session({
        name: 'i-learning-hubb',
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            mongoUrl: process.env.MONGO_URI,
            collectionName: 'sessions_ilearninghubb'
        }),
        cookie: {
            maxAge: 1000 * 60 * 60 * 24,
        },
    }),
);

app.use(express.json());
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.json({ limit: '50mb' }));
app.use('/static', express.static(path.join(__dirname, 'static')));

const indexController = require('./controllers/indexController');

// Redirect root to index.html for direct HTML serving
app.get('/', indexController.landingPage);

const seedDatabase = require('./modules/seedData');

const PORT = process.env.PORT || 3000;

// Determine the correct path by checking if we're in a nested directory structure
const getCorrectPath = (basePath, relativePath) => {
    // First try the direct path
    const directPath = path.join(basePath, relativePath);
    if (fs.existsSync(directPath)) {
        return directPath;
    }
    
    // If not found, try one level up (nested case)
    const nestedPath = path.join(basePath, '..', relativePath);
    if (fs.existsSync(nestedPath)) {
        return nestedPath;
    }
    
    // Default to the direct path if neither exists
    return directPath;
};

// Get the correct kidscamp path
const kidscampPath = getCorrectPath(__dirname, 'kidscamp');
const assetsPath = path.join(kidscampPath, 'assets');

// Serve static files from the correct paths
app.use(express.static(kidscampPath));
app.use('/assets', express.static(assetsPath));

// Add proper MIME types for common image formats
app.use((req, res, next) => {
    const ext = path.extname(req.url).toLowerCase();
    switch (ext) {
        case '.jpg':
        case '.jpeg':
            res.type('image/jpeg');
            break;
        case '.png':
            res.type('image/png');
            break;
        case '.gif':
            res.type('image/gif');
            break;
        case '.svg':
            res.type('image/svg+xml');
            break;
    }
    next();
});

// Handle form submissions from sendemail.php
app.post('/sendemail.php', async (req, res) => {
    const { username, email, phone, service, message } = req.body;
    
    // Validate required fields
    if (!username || !email || !message) {
        return res.redirect('/contact.html?message=missing');
    }
    
    try {
        // Import the Contact model
        const Contact = require('./models/contact');
        
        // Save to database
        await Contact.create({
            name: username,
            email,
            phone,
            service,
            message
        });
        
        // Redirect with success message
        res.redirect('/contact.html?message=success');
    } catch (err) {
        // Redirect with error message
        res.redirect('/contact.html?message=error');
    }
});

// Dynamic routes for handlebars templates
const regularRoutes = require('./routes/regularRoutes');
app.use('/api', regularRoutes);

// Debug route to list available images
app.get('/debug/images', (req, res) => {
    const imagesDir = path.join(kidscampPath, 'assets', 'images');
    
    // Function to get all files in a directory and subdirectories
    const getAllFiles = function(dirPath, arrayOfFiles) {
        files = fs.readdirSync(dirPath);
        
        arrayOfFiles = arrayOfFiles || [];
        
        files.forEach(function(file) {
            if (fs.statSync(dirPath + "/" + file).isDirectory()) {
                arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
            } else {
                arrayOfFiles.push(path.join(dirPath, file).replace(imagesDir, ''));
            }
        });
        
        return arrayOfFiles;
    };
    
    try {
        const allImages = getAllFiles(imagesDir);
        res.json({
            imagesCount: allImages.length,
            imagesDirectory: imagesDir,
            images: allImages,
            staticPaths: [
                kidscampPath,
                assetsPath
            ]
        });
    } catch (err) {
        res.status(500).json({
            error: err.message,
            imagesDirectory: imagesDir
        });
    }
});

// Direct route for serving images if static middleware doesn't catch them
app.get('/assets/images/:folder/:filename', (req, res) => {
    const { folder, filename } = req.params;
    res.sendFile(path.join(kidscampPath, 'assets', 'images', folder, filename));
});

app.get('/assets/images/:filename', (req, res) => {
    res.sendFile(path.join(kidscampPath, 'assets', 'images', req.params.filename));
});


// Direct route handling for the HTML files
const htmlPages = [
    'about', 'blog', 'blog-classic', 'blog-detail', 'blog-sidebar',
    'contact', 'faq', 'gallery', 'index-2', 'index-3', 'not-found',
    'program', 'program-detail', 'register', 'reset-password',
    'team', 'team-detail', 'testimonial'
];

// QASIM: here we need to load content from database for each page, process it (if needed) and then render the page
htmlPages.forEach(page => {
    app.get(`/${page}`, (req, res) => {
        res.sendFile(path.join(kidscampPath, `${page}.html`));
    });
});

// Import error controller
const errorController = require('./controllers/errorController');

// Catch-all route for 404 errors
app.use(async (req, res) => {
    await errorController.notFound(req, res);
});

// Global error handler
app.use(async (err, req, res, next) => {
    await errorController.serverError(req, res, err);
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
