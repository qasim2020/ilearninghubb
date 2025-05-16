const exphbs = require('express-handlebars');
const session = require('express-session');
const express = require('express');
const MongoStore = require('connect-mongo');
const hbsHelpers = require('../modules/helpers');
const path = require('path');
const fs = require('fs');

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

app.get('/debug/images', (req, res) => {
    const imagesDir = path.join(kidscampPath, 'assets', 'images');

    const getAllFiles = function (dirPath, arrayOfFiles) {
        files = fs.readdirSync(dirPath);

        arrayOfFiles = arrayOfFiles || [];

        files.forEach(function (file) {
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

module.exports = app;