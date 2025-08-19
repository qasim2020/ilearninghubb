require('dotenv').config();
const mongoose = require('./config/db');
mongoose();
const express = require('express');
const path = require('path');
const fs = require('fs');
const { app, kidscampPath, assetsPath } = require('./config/express');
const pageRoutes = require('./routes/pageRoutes');
const emailRoutes = require('./routes/emailRoutes');
const { sendErrorToTelegram } = require('./modules/bot');

app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const timestamp = new Date().toISOString();
    const country = req.headers['cf-ipcountry'] || 'Unknown';
    console.log(`${timestamp} | ${ip} | ${country} | ${req.originalUrl} `);
    let oldSend = res.send;
    let oldJson = res.json;

    let responseBody;

    res.send = function (data) {
        responseBody = data;
        return oldSend.apply(res, arguments);
    };

    res.json = function (data) {
        responseBody = data;
        return oldJson.apply(res, arguments);
    };

    const forbiddenErrors = ['/overlay/fonts/Karla-regular.woff', '/robots.txt'];

    res.on('finish', () => {
        if (res.statusCode > 399 && !forbiddenErrors.includes(req.originalUrl)) {
            const errorData = {
                message: responseBody,
                status: res.statusCode,
                url: req.originalUrl,
            };
            sendErrorToTelegram(errorData);
        }
    });

    next();
});

app.use('/xmlrpc.php', express.static(path.join(__dirname, 'static/allowurl.txt')));
app.use('/robots.txt', express.static(path.join(__dirname, 'static/robots.txt')));
app.use(pageRoutes);
app.use(emailRoutes);

const htmlPages = [
    'about', 'blog', 'blog-classic', 'blog-detail', 'blog-sidebar',
    'contact', 'faq', 'gallery', 'index-2', 'index-3', 'not-found',
    'program', 'program-detail', 'register', 'reset-password',
    'team', 'team-detail', 'testimonial', 'pricing',
    'about-us', 'about-bootcamp', 'past-events', 'upcoming-events'
];

htmlPages.forEach(page => {
    app.get(`/${page}`, (req, res) => {
        const viewPath = path.join(__dirname, 'views', `${page}.handlebars`);
        if (fs.existsSync(viewPath)) {
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

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
