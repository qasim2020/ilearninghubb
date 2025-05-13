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
// app.use(
//     session({
//         name: 'i-learning-hubb',
//         secret: process.env.SESSION_SECRET,
//         resave: false,
//         saveUninitialized: false,
//         store: MongoStore.create({
//             mongoUrl: process.env.MONGO_URI,
//             collectionName: 'sessions_ilearninghubb'
//         }),
//         cookie: {
//             maxAge: 1000 * 60 * 60 * 24,
//         },
//     }),
// );

app.use(express.json());
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.json({ limit: '50mb' }));
app.use('/static', express.static(path.join(__dirname, 'static')));

app.use((req, res, next) => {
    console.log(req.originalUrl);
    next();
});

const indexController = require('./controllers/indexController');

app.get('/', indexController.landingPage);



const PORT = process.env.PORT || 3000;

const getCorrectPath = (basePath, relativePath) => {
    const directPath = path.join(basePath, relativePath);
    if (fs.existsSync(directPath)) {
        return directPath;
    }
    
    const nestedPath = path.join(basePath, '..', relativePath);
    if (fs.existsSync(nestedPath)) {
        return nestedPath;
    }
    
    return directPath;
};

const kidscampPath = getCorrectPath(__dirname, 'kidscamp');
const assetsPath = path.join(kidscampPath, 'assets');

app.use(express.static(kidscampPath));
app.use('/assets', express.static(assetsPath));

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

app.post('/sendemail.php', async (req, res) => {
    const { username, email, phone, service, message } = req.body;
    
    if (!username || !email || !message) {
        return res.redirect('/contact.html?message=missing');
    }
    
    try {
        const Contact = require('./models/contact');
        
        await Contact.create({
            name: username,
            email,
            phone,
            service,
            message
        });
        
        res.redirect('/contact.html?message=success');
    } catch (err) {
        res.redirect('/contact.html?message=error');
    }
});

const regularRoutes = require('./routes/regularRoutes');
app.use('/', regularRoutes);

app.get('/debug/images', (req, res) => {
    const imagesDir = path.join(kidscampPath, 'assets', 'images');
    
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

app.get('/assets/images/:folder/:filename', (req, res) => {
    const { folder, filename } = req.params;
    res.sendFile(path.join(kidscampPath, 'assets', 'images', folder, filename));
});

app.get('/assets/images/:filename', (req, res) => {
    res.sendFile(path.join(kidscampPath, 'assets', 'images', req.params.filename));
});


const htmlPages = [
    'about', 'blog', 'blog-classic', 'blog-detail', 'blog-sidebar',
    'contact', 'faq', 'gallery', 'index-2', 'index-3', 'not-found',
    'program', 'program-detail', 'register', 'reset-password',
    'team', 'team-detail', 'testimonial', 'pricing',
    'about-us', 'about-bootcamp', 'past-events', 'upcoming-events'
];

// QASIM: here we need to load content from database for each page, process it (if needed) and then render the page
htmlPages.forEach(page => {
    // Handle both with and without .html extension
    app.get(`/${page}`, (req, res) => {
        const viewPath = path.join(__dirname, 'views', `${page}.handlebars`);
        if (fs.existsSync(viewPath)) {
            // Prepare data for handlebars template
            const data = {
                settings: {
                    brandMobile: '302-555-0107',
                    brandEmail: 'support@ilearninghubb.com',
                    address: '123 Education Lane, Learning City, ED 12345'
                },
                siginURL: '/login.html'
            };
            
            return res.render(page, { data });
        }
        
        res.sendFile(path.join(kidscampPath, `${page}.html`));
    });
    
    app.get(`/${page}.html`, (req, res) => {
        const viewPath = path.join(__dirname, 'views', `${page}.handlebars`);
        if (fs.existsSync(viewPath)) {
            // Prepare data for handlebars template
            const data = {
                settings: {
                    brandMobile: '302-555-0107',
                    brandEmail: 'support@ilearninghubb.com',
                    address: '123 Education Lane, Learning City, ED 12345'
                },
                siginURL: '/login.html'
            };
            
            return res.render(page, { data });
        }
        
        res.sendFile(path.join(kidscampPath, `${page}.html`));
    });
});

const errorController = require('./controllers/errorController');

app.use(async (req, res) => {
    await errorController.notFound(req, res);
});

app.use(async (err, req, res, next) => {
    await errorController.serverError(req, res, err);
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
