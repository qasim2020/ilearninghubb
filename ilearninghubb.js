require('dotenv').config();
const mongoose = require('./config/db');
mongoose();
const express = require('express');
const path = require('path');
const fs = require('fs');
const { app, kidscampPath, assetsPath } = require('./config/express');
const pageRoutes = require('./routes/pageRoutes');
const emailRoutes = require('./routes/emailRoutes');
const checkoutRoutes = require('./routes/checkoutRoutes');
const { sendErrorToTelegram } = require('./modules/bot');
const Program = require('./models/Program');
const Blog = require('./models/Blog');

function normalizePublicMediaUrl(url) {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;

    const cleaned = String(url).trim().replace(/^\.{1,2}\//, '');
    const uploadMatch = cleaned.match(/uploads\/.*$/i);
    if (uploadMatch) {
        return `/${uploadMatch[0]}`;
    }

    return cleaned.startsWith('/') ? cleaned : `/${cleaned}`;
}

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
            // sendErrorToTelegram(errorData);
        }
    });

    next();
});

app.use(async (req, res, next) => {
    try {
        const [footerProgramsRaw, footerBlogsRaw] = await Promise.all([
            Program.find({ isActive: true })
                .sort({ createdAt: -1 })
                .select('_id title imageUrl gallery')
                .lean(),
            Blog.find({ $or: [{ isActive: true }, { isActive: { $exists: false } }] })
                .sort({ publishedAt: -1, createdAt: -1 })
                .select('_id slug title name')
                .lean(),
        ]);

        const footerPrograms = (footerProgramsRaw || []).map((program) => ({
            _id: program._id,
            title: String(program.title || '').trim() || 'Program',
        }));

        const footerBlogs = (footerBlogsRaw || []).map((blog) => ({
            slug: String(blog.slug || '').trim(),
            title: String(blog.title || blog.name || '').trim() || 'Blog',
        })).filter((blog) => blog.slug);

        const galleryCandidates = [];
        (footerProgramsRaw || []).forEach((program) => {
            const programTitle = String(program.title || '').trim() || 'Program';

            if (program.imageUrl) {
                galleryCandidates.push({
                    url: normalizePublicMediaUrl(program.imageUrl),
                    title: programTitle,
                });
            }

            (program.gallery || []).forEach((item) => {
                const mediaType = item?.type === 'video' ? 'video' : 'image';
                const mediaStatus = item?.status || 'ready';
                if (mediaType !== 'image' || mediaStatus !== 'ready') return;

                const rawUrl = item?.url || item?.originalUrl || (item?.filename ? `/uploads/${item.filename}` : '');
                if (!rawUrl) return;
                galleryCandidates.push({
                    url: normalizePublicMediaUrl(rawUrl),
                    title: programTitle,
                });
            });
        });

        const seen = new Set();
        const footerGalleryImages = galleryCandidates.filter((item) => {
            if (!item.url || seen.has(item.url)) return false;
            seen.add(item.url);
            return true;
        }).slice(0, 6);

        res.locals.footerPrograms = footerPrograms;
        res.locals.footerBlogs = footerBlogs;
        res.locals.footerGalleryImages = footerGalleryImages;
    } catch (error) {
        console.error('Failed to load footer content:', error);
        res.locals.footerPrograms = [];
        res.locals.footerBlogs = [];
        res.locals.footerGalleryImages = [];
    }

    next();
});

app.use('/xmlrpc.php', express.static(path.join(__dirname, 'static/allowurl.txt')));
app.use('/robots.txt', express.static(path.join(__dirname, 'static/robots.txt')));
app.use('/wp-login.php', express.static(path.join(__dirname, 'static/allowurl.txt')));


app.use(pageRoutes);
app.use(emailRoutes);
app.use(checkoutRoutes);

const htmlPages = [
    'about', 'blog', 'blog-classic', 'blog-detail', 'blog-sidebar',
    'faq', 'gallery', 'index-2', 'index-3', 'not-found',
    'program', 'program-detail', 'register', 'reset-password',
    'team', 'team-detail', 'testimonial', 'pricing',
    'about-us', 'about-bootcamp', 'past-events', 'upcoming-events', 'contact',
];

htmlPages.forEach(page => {
    app.get(`/${page}.html`, (req, res) => {
        const viewPath = path.join(__dirname, 'views', `${page}.handlebars`);
        if (fs.existsSync(viewPath)) {
            console.log(page + ' page found - rendering view');
            return res.render(page);
        }
        console.log('page not found - opening static route');
        res.sendFile(path.join(kidscampPath, `${page}.html`));
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
