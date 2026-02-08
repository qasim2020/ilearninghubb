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
            Blog.find({ isActive: true }).sort({ publishedAt: -1, createdAt: -1 }).lean(),
            Page.find({}).lean(),
        ]);

        const cmsBaseUrl = process.env.CMS_BASE_URL || process.env.DOMAIN_URL || '';
        const normalizeImageUrl = (url) => {
            if (!url) return '';
            if (/^https?:\/\//i.test(url)) return url;
            if (cmsBaseUrl && url.startsWith('/')) return `${cmsBaseUrl}${url}`;
            return url;
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
            blogPosts: blogs || [],
        });

    } catch (error) {
        console.error('Error in index controller:', error);
        await renderPage(req, res, 'index', {});
    }
};

exports.blogPost = async (req, res) => {
    try {
        const { slug } = req.params;
        const [settings, blog] = await Promise.all([
            Settings.findOne({ key: 'main' }).lean(),
            Blog.findOne({ slug, isActive: true }).lean(),
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
            if (cmsBaseUrl && url.startsWith('/')) return `${cmsBaseUrl}${url}`;
            return url;
        };

        const normalizedSettings = {
            ...(settings || {}),
            logoUrl: normalizeImageUrl(settings?.logoUrl),
        };

        const normalizedBlog = {
            ...blog,
            coverImageUrlResolved: normalizeImageUrl(blog.coverImageUrl),
        };

        return res.render('blog-detail', {
            settings: normalizedSettings,
            blog: normalizedBlog,
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
