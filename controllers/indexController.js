const { renderPage } = require('./controllerUtils');
const Settings = require('../models/Settings');
const Program = require('../models/Program');
const Blog = require('../models/Blog');
const Page = require('../models/Page');

exports.index = async (req, res) => {
    try {
        const [settings, programs, blogs, pages] = await Promise.all([
            Settings.findOne({ key: 'main' }).lean(),
            Program.find({ isActive: true }).sort({ createdAt: -1 }).lean(),
            Blog.find({
                $or: [{ isActive: true }, { isActive: { $exists: false } }],
            })
                .sort({ publishedAt: -1, createdAt: -1 })
                .lean(),
            Page.find({}).lean(),
        ]);

        const cmsBaseUrl = process.env.CMS_BASE_URL || process.env.DOMAIN_URL || '';
        const normalizeImageUrl = (url) => {
            if (!url) return '';
            if (/^https?:\/\//i.test(url)) return url;

            const cleaned = String(url).trim().replace(/^\.{1,2}\//, '');
            const uploadMatch = cleaned.match(/uploads\/.*$/i);
            if (uploadMatch) return `/${uploadMatch[0]}`;

            if (cmsBaseUrl) {
                if (cleaned.startsWith('/')) return `${cmsBaseUrl}${cleaned}`;
                return `${cmsBaseUrl}/${cleaned}`;
            }

            return cleaned;
        };

        const stripHtml = (value) => String(value || '').replace(/<[^>]*>/g, '').trim();

        const normalizedPrograms = (programs || []).map((program) => {
            const durationText = String(program.duration || '').trim();
            let durationValue = durationText;
            let durationLabel = '';

            const match = durationText.match(/^\s*(\d+)\s*(.*)$/);
            if (match) {
                durationValue = match[1];
                durationLabel = match[2] || '';
            }

            return {
                ...program,
                imageUrlResolved: normalizeImageUrl(program.imageUrl),
                durationValue: durationValue || 'Program',
                durationLabel: durationLabel || '',
                descriptionText: stripHtml(program.description || program.specialFeatures || ''),
            };
        });

        const normalizedBlogs = (blogs || []).map((blog) => ({
            ...blog,
            coverImageUrlResolved: normalizeImageUrl(blog.coverImageUrl),
        }));

        const pagesByKey = (pages || []).reduce((acc, page) => {
            acc[page.key] = page;
            return acc;
        }, {});

        const normalizedSettings = {
            ...(settings || {}),
            logoUrl: normalizeImageUrl(settings?.logoUrl),
        };

        return res.render('index', {
            settings: normalizedSettings,
            programs: normalizedPrograms || [],
            blogs: normalizedBlogs || [],
            pages: pagesByKey,
            blogPosts: normalizedBlogs || [],
        });

    } catch (error) {
        console.error('Error in index controller:', error);
        await renderPage(req, res, 'index', {});
    }
};

exports.blogPost = async (req, res) => {
    try {
        const { slug } = req.params;
        const [settings, blog, blogs, pages] = await Promise.all([
            Settings.findOne({ key: 'main' }).lean(),
            Blog.findOne({
                slug,
                $or: [{ isActive: true }, { isActive: { $exists: false } }],
            }).lean(),
            Blog.find({ $or: [{ isActive: true }, { isActive: { $exists: false } }] })
                .sort({ publishedAt: -1, createdAt: -1 })
                .lean(),
            Page.find({}).lean(),
        ]);

        if (!blog) {
            return res.status(404).render('not-found', {
                settings: settings || {},
                error: 'Blog post not found',
                message: 'The blog post you are looking for does not exist.',
            });
        }

        const cmsBaseUrl = process.env.CMS_BASE_URL || process.env.DOMAIN_URL || '';
        const normalizeImageUrl = (url) => {
            if (!url) return '';
            if (/^https?:\/\//i.test(url)) return url;

            const cleaned = String(url).trim().replace(/^\.{1,2}\//, '');
            const uploadMatch = cleaned.match(/uploads\/.*$/i);
            if (uploadMatch) return `/${uploadMatch[0]}`;

            if (cmsBaseUrl) {
                if (cleaned.startsWith('/')) return `${cmsBaseUrl}${cleaned}`;
                return `${cmsBaseUrl}/${cleaned}`;
            }

            return cleaned;
        };

        const normalizedSettings = {
            ...(settings || {}),
            logoUrl: normalizeImageUrl(settings?.logoUrl),
        };

        const normalizedBlog = {
            ...blog,
            coverImageUrlResolved: normalizeImageUrl(blog.coverImageUrl),
        };

        const normalizedBlogs = (blogs || []).map((b) => ({
            ...b,
            coverImageUrlResolved: normalizeImageUrl(b.coverImageUrl),
        }));

        const pagesByKey = (pages || []).reduce((acc, page) => {
            acc[page.key] = page;
            return acc;
        }, {});

        return res.render('blog-detail', {
            settings: normalizedSettings,
            blog: normalizedBlog,
            blogPosts: normalizedBlogs,
            pages: pagesByKey,
        });
    } catch (error) {
        console.error('Error loading blog post:', error);
        return res.status(500).render('error', {
            settings: {},
            error: 'Failed to load blog post',
            message: error.message,
        });
    }
};

exports.pageView = async (req, res) => {
    try {
        const { key } = req.params;
        const [settings, page, blogs, pages] = await Promise.all([
            Settings.findOne({ key: 'main' }).lean(),
            Page.findOne({ key }).lean(),
            Blog.find({ $or: [{ isActive: true }, { isActive: { $exists: false } }] })
                .sort({ publishedAt: -1, createdAt: -1 })
                .lean(),
            Page.find({}).lean(),
        ]);

        if (!page) {
            return res.status(404).render('not-found', {
                settings: settings || {},
                error: 'Page not found',
                message: 'The page you are looking for does not exist.',
            });
        }

        const cmsBaseUrl = process.env.CMS_BASE_URL || process.env.DOMAIN_URL || '';
        const normalizeImageUrl = (url) => {
            if (!url) return '';
            if (/^https?:\/\//i.test(url)) return url;

            const cleaned = String(url).trim().replace(/^\.{1,2}\//, '');
            const uploadMatch = cleaned.match(/uploads\/.*$/i);
            if (uploadMatch) return `/${uploadMatch[0]}`;

            if (cmsBaseUrl) {
                if (cleaned.startsWith('/')) return `${cmsBaseUrl}${cleaned}`;
                return `${cmsBaseUrl}/${cleaned}`;
            }

            return cleaned;
        };

        const normalizedSettings = {
            ...(settings || {}),
            logoUrl: normalizeImageUrl(settings?.logoUrl),
        };

        const normalizedBlogs = (blogs || []).map((b) => ({
            ...b,
            coverImageUrlResolved: normalizeImageUrl(b.coverImageUrl),
        }));

        const pagesByKey = (pages || []).reduce((acc, p) => {
            acc[p.key] = p;
            return acc;
        }, {});

        return res.render('page-detail', {
            settings: normalizedSettings,
            page: page,
            blogPosts: normalizedBlogs,
            pages: pagesByKey,
            isContact: String(page.key || '').toLowerCase() === 'contact',
        });
    } catch (error) {
        console.error('Error loading page:', error);
        return res.status(500).render('error', {
            settings: {},
            error: 'Failed to load page',
            message: error.message,
        });
    }
};

exports.programDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const [settings, program, blogs, pages] = await Promise.all([
            Settings.findOne({ key: 'main' }).lean(),
            Program.findById(id).lean(),
            Blog.find({ $or: [{ isActive: true }, { isActive: { $exists: false } }] })
                .sort({ publishedAt: -1, createdAt: -1 })
                .lean(),
            Page.find({}).lean(),
        ]);

        if (!program) {
            return res.status(404).render('not-found', {
                settings: settings || {},
                error: 'Program not found',
                message: 'The program you are looking for does not exist.',
            });
        }

        const cmsBaseUrl = process.env.CMS_BASE_URL || process.env.DOMAIN_URL || '';
        const normalizeImageUrl = (url) => {
            if (!url) return '';
            if (/^https?:\/\//i.test(url)) return url;

            const cleaned = String(url).trim().replace(/^\.{1,2}\//, '');
            const uploadMatch = cleaned.match(/uploads\/.*$/i);
            if (uploadMatch) return `/${uploadMatch[0]}`;

            if (cmsBaseUrl) {
                if (cleaned.startsWith('/')) return `${cmsBaseUrl}${cleaned}`;
                return `${cmsBaseUrl}/${cleaned}`;
            }

            return cleaned;
        };

        const normalizedSettings = {
            ...(settings || {}),
            logoUrl: normalizeImageUrl(settings?.logoUrl),
        };

        const normalizedBlogs = (blogs || []).map((blog) => ({
            ...blog,
            coverImageUrlResolved: normalizeImageUrl(blog.coverImageUrl),
        }));

        const pagesByKey = (pages || []).reduce((acc, page) => {
            acc[page.key] = page;
            return acc;
        }, {});

        // normalize gallery items
        const gallery = (program.gallery || []).map((g) => ({
            ...g,
            urlResolved: normalizeImageUrl(g.url || g.file || g.filename || ''),
        }));

        const normalizedProgram = {
            ...program,
            imageUrlResolved: normalizeImageUrl(program.imageUrl),
            gallery,
        };

        // fetch up to 2 other active programs (exclude current)
        const otherProgramsRaw = await Program.find({ isActive: true, _id: { $ne: program._id } })
            .sort({ createdAt: -1 })
            .limit(2)
            .lean();

        const otherPrograms = (otherProgramsRaw || []).map((p) => ({
            ...p,
            imageUrlResolved: normalizeImageUrl(p.imageUrl),
            descriptionText: String(p.description || p.specialFeatures || '').replace(/<[^>]*>/g, '').slice(0, 160),
        }));

        return res.render('program-detail', {
            settings: normalizedSettings,
            program: normalizedProgram,
            otherPrograms,
            blogPosts: normalizedBlogs,
            pages: pagesByKey,
        });
    } catch (error) {
        console.error('Error loading program:', error);
        return res.status(500).render('error', {
            settings: {},
            error: 'Failed to load program',
            message: error.message,
        });
    }
};

exports.programsList = async (req, res) => {
    try {
        const [settings, programs, blogs, pages] = await Promise.all([
            Settings.findOne({ key: 'main' }).lean(),
            Program.find({ isActive: true }).sort({ createdAt: -1 }).lean(),
            Blog.find({ $or: [{ isActive: true }, { isActive: { $exists: false } }] })
                .sort({ publishedAt: -1, createdAt: -1 })
                .lean(),
            Page.find({}).lean(),
        ]);

        const cmsBaseUrl = process.env.CMS_BASE_URL || process.env.DOMAIN_URL || '';
        const normalizeImageUrl = (url) => {
            if (!url) return '';
            if (/^https?:\/\//i.test(url)) return url;

            const cleaned = String(url).trim().replace(/^\.{1,2}\//, '');
            const uploadMatch = cleaned.match(/uploads\/.*$/i);
            if (uploadMatch) return `/${uploadMatch[0]}`;

            if (cmsBaseUrl) {
                if (cleaned.startsWith('/')) return `${cmsBaseUrl}${cleaned}`;
                return `${cmsBaseUrl}/${cleaned}`;
            }

            return cleaned;
        };

        const stripHtml = (value) => String(value || '').replace(/<[^>]*>/g, '').trim();

        const normalizedPrograms = (programs || []).map((program) => {
            const durationText = String(program.duration || '').trim();
            let durationValue = durationText;
            let durationLabel = '';

            const match = durationText.match(/^\s*(\d+)\s*(.*)$/);
            if (match) {
                durationValue = match[1];
                durationLabel = match[2] || '';
            }

            return {
                ...program,
                imageUrlResolved: normalizeImageUrl(program.imageUrl),
                durationValue: durationValue || 'Program',
                durationLabel: durationLabel || '',
                descriptionText: stripHtml(program.description || program.specialFeatures || ''),
            };
        });

        const normalizedBlogs = (blogs || []).map((b) => ({
            ...b,
            coverImageUrlResolved: normalizeImageUrl(b.coverImageUrl),
        }));

        const pagesByKey = (pages || []).reduce((acc, p) => {
            acc[p.key] = p;
            return acc;
        }, {});

        const normalizedSettings = {
            ...(settings || {}),
            logoUrl: normalizeImageUrl(settings?.logoUrl),
        };

        return res.render('programs', {
            settings: normalizedSettings,
            programs: normalizedPrograms || [],
            blogPosts: normalizedBlogs || [],
            pages: pagesByKey,
        });
    } catch (error) {
        console.error('Error loading programs list:', error);
        return res.status(500).render('error', {
            settings: {},
            error: 'Failed to load programs',
            message: error.message,
        });
    }
};
