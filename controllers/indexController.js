const { renderPage } = require('./controllerUtils');
const Settings = require('../models/Settings');
const Program = require('../models/Program');
const Blog = require('../models/Blog');
const Page = require('../models/Page');
const Ticket = require('../models/Ticket');
const TeamMember = require('../models/TeamMember');
const { getCurrencyFromCountry, convertAmount, normalizeCurrency } = require('../modules/currencyUtils');

const ADVANCE_TOUR_PRICE_NOK = 100;
const ADVANCE_TOUR_COUNTDOWN_MONTH = 4; // April
const ADVANCE_TOUR_COUNTDOWN_DAY = 1;

function joinBaseUrl(base, suffix) {
    return `${String(base || '').replace(/\/+$/, '')}/${String(suffix || '').replace(/^\/+/, '')}`;
}

function normalizeImageUrlWithBase(url, cmsBaseUrl) {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;

    const cleaned = String(url).trim().replace(/^\.{1,2}\//, '');
    const uploadMatch = cleaned.match(/uploads\/.*$/i);
    if (uploadMatch) {
        if (cmsBaseUrl) return joinBaseUrl(cmsBaseUrl, uploadMatch[0]);
        return `/${uploadMatch[0]}`;
    }

    if (cmsBaseUrl) return joinBaseUrl(cmsBaseUrl, cleaned);
    return cleaned;
}

function normalizeImagePosition(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 50;
    return Math.min(100, Math.max(0, Math.round(parsed)));
}

function getAnnualAdvanceTourCountdownDate() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const aprilFirstThisYear = new Date(currentYear, ADVANCE_TOUR_COUNTDOWN_MONTH - 1, ADVANCE_TOUR_COUNTDOWN_DAY, 0, 0, 0, 0);
    const targetYear = now < aprilFirstThisYear ? currentYear : currentYear + 1;
    const month = String(ADVANCE_TOUR_COUNTDOWN_MONTH).padStart(2, '0');
    const day = String(ADVANCE_TOUR_COUNTDOWN_DAY).padStart(2, '0');
    return `${targetYear}/${month}/${day}`;
}

async function getAdvanceTourStats() {
    const paidBookings = await Ticket.aggregate([
        {
            $match: {
                source: 'advance-tour-booking',
                paymentStatus: 'paid',
            },
        },
        {
            $group: {
                _id: null,
                total: { $sum: { $ifNull: ['$quantity', 1] } },
            },
        },
    ]);

    const bookedSeats = Math.max(0, Number(paidBookings?.[0]?.total || 0));

    return {
        bookedSeats,
        bookingPriceNok: ADVANCE_TOUR_PRICE_NOK,
        hasSeatLimit: false,
    };
}

function normalizeTeamMembers(members, normalizeImageUrl) {
    return (members || []).map((member) => {
        const socialLinks = member.socialLinks || {};
        return {
            ...member,
            displayName: String(member.name || '').trim() || 'Team Member',
            displayRole: String(member.role || '').trim(),
            displayBio: String(member.bio || '').trim(),
            imageUrlResolved: normalizeImageUrl(member.imageUrl),
            socialLinks: {
                twitter: String(socialLinks.twitter || '').trim(),
                linkedin: String(socialLinks.linkedin || '').trim(),
                facebook: String(socialLinks.facebook || '').trim(),
            },
        };
    });
}

function extractProgramGalleryMedia(programs, normalizeImageUrl) {
    const media = [];

    (programs || []).forEach((program) => {
        const programTitle = String(program?.title || '').trim() || 'Program';

        (program?.gallery || []).forEach((item) => {
            const mediaType = item?.type === 'video' ? 'video' : 'image';
            const mediaStatus = item?.status || 'ready';
            if (mediaStatus !== 'ready') return;

            const rawUrl = item?.url || item?.originalUrl || (item?.filename ? `/uploads/${item.filename}` : '');
            if (!rawUrl) return;

            const rawThumbnail = item?.thumbnailUrl || (item?.thumbnailFilename ? `/uploads/${item.thumbnailFilename}` : '');

            media.push({
                url: normalizeImageUrl(rawUrl),
                thumbnailUrl: normalizeImageUrl(rawThumbnail || rawUrl),
                type: mediaType,
                title: programTitle,
                uploadedAt: item?.uploadedAt || null,
            });
        });
    });

    const seen = new Set();
    return media
        .filter((item) => {
        if (!item.url || seen.has(item.url)) return false;
        seen.add(item.url);
        return true;
    })
        .sort((a, b) => new Date(b.uploadedAt || 0).getTime() - new Date(a.uploadedAt || 0).getTime());
}

async function getSiteRenderData() {
    const [settings, blogs, pages] = await Promise.all([
        Settings.findOne({ key: 'main' }).lean(),
        Blog.find({ $or: [{ isActive: true }, { isActive: { $exists: false } }] })
            .sort({ publishedAt: -1, createdAt: -1 })
            .lean(),
        Page.find({}).lean(),
    ]);

    const cmsBaseUrl = process.env.CMS_BASE_URL || '';
    const normalizeImageUrl = (url) => normalizeImageUrlWithBase(url, cmsBaseUrl);

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

    return {
        settings: normalizedSettings,
        blogPosts: normalizedBlogs,
        pages: pagesByKey,
    };
}

function buildCondensedPaginationItems(currentPage, totalPages) {
    if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, index) => {
            const pageNumber = index + 1;
            return {
                type: 'page',
                pageNumber,
                href: `/gallery?page=${pageNumber}`,
                isActive: pageNumber === currentPage,
            };
        });
    }

    const pages = new Set([1, totalPages, currentPage]);
    for (let page = currentPage - 1; page <= currentPage + 1; page += 1) {
        if (page > 1 && page < totalPages) {
            pages.add(page);
        }
    }

    const sortedPages = Array.from(pages).sort((a, b) => a - b);
    const items = [];

    for (let index = 0; index < sortedPages.length; index += 1) {
        const pageNumber = sortedPages[index];
        const previousPage = sortedPages[index - 1];

        if (typeof previousPage === 'number' && pageNumber - previousPage > 1) {
            items.push({ type: 'ellipsis' });
        }

        items.push({
            type: 'page',
            pageNumber,
            href: `/gallery?page=${pageNumber}`,
            isActive: pageNumber === currentPage,
        });
    }

    return items;
}

exports.index = async (req, res) => {
    try {
        const [settings, programs, blogs, pages, advanceTour] = await Promise.all([
            Settings.findOne({ key: 'main' }).lean(),
            Program.find({ isActive: true }).sort({ createdAt: -1 }).lean(),
            Blog.find({
                $or: [{ isActive: true }, { isActive: { $exists: false } }],
            })
                .sort({ publishedAt: -1, createdAt: -1 })
                .lean(),
            Page.find({}).lean(),
            getAdvanceTourStats(),
        ]);

        const cmsBaseUrl = process.env.CMS_BASE_URL || '';
        const normalizeImageUrl = (url) => normalizeImageUrlWithBase(url, cmsBaseUrl);

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
            advanceTour,
            advanceTourCountdownDate: getAnnualAdvanceTourCountdownDate(),
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

        const cmsBaseUrl = process.env.CMS_BASE_URL || '';
        const normalizeImageUrl = (url) => normalizeImageUrlWithBase(url, cmsBaseUrl);

        const normalizedSettings = {
            ...(settings || {}),
            logoUrl: normalizeImageUrl(settings?.logoUrl),
        };

        const normalizedBlog = {
            ...blog,
            coverImageUrlResolved: normalizeImageUrl(blog.coverImageUrl),
            specialFeatures: blog.specialFeatures || '',
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
        const keyLower = String(key || '').toLowerCase();
        const detachedStaticRoutes = {
            faq: '/faq',
            terms: '/terms-and-conditions',
            privacy: '/privacy-policy',
            cookies: '/cookies-policy',
        };

        if (detachedStaticRoutes[keyLower]) {
            return res.redirect(301, detachedStaticRoutes[keyLower]);
        }

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

        const cmsBaseUrl = process.env.CMS_BASE_URL || '';
        const normalizeImageUrl = (url) => normalizeImageUrlWithBase(url, cmsBaseUrl);

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

exports.faqPage = async (req, res) => {
    try {
        const commonData = await getSiteRenderData();
        return res.render('faq', commonData);
    } catch (error) {
        console.error('Error loading FAQ page:', error);
        return res.status(500).render('error', {
            settings: {},
            error: 'Failed to load FAQ page',
            message: error.message,
        });
    }
};

exports.termsPage = async (req, res) => {
    try {
        const commonData = await getSiteRenderData();
        return res.render('terms-and-conditions', commonData);
    } catch (error) {
        console.error('Error loading terms page:', error);
        return res.status(500).render('error', {
            settings: {},
            error: 'Failed to load terms page',
            message: error.message,
        });
    }
};

exports.privacyPage = async (req, res) => {
    try {
        const commonData = await getSiteRenderData();
        return res.render('privacy-policy', commonData);
    } catch (error) {
        console.error('Error loading privacy page:', error);
        return res.status(500).render('error', {
            settings: {},
            error: 'Failed to load privacy page',
            message: error.message,
        });
    }
};

exports.cookiesPage = async (req, res) => {
    try {
        const commonData = await getSiteRenderData();
        return res.render('cookies-policy', commonData);
    } catch (error) {
        console.error('Error loading cookies page:', error);
        return res.status(500).render('error', {
            settings: {},
            error: 'Failed to load cookies page',
            message: error.message,
        });
    }
};

exports.programDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const checkoutStatus = ['success', 'cancel'].includes(String(req.query.checkout || ''))
            ? String(req.query.checkout)
            : null;
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

        const cmsBaseUrl = process.env.CMS_BASE_URL || '';
        const normalizeImageUrl = (url) => normalizeImageUrlWithBase(url, cmsBaseUrl);

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
        const gallery = (program.gallery || [])
            .map((g) => {
                const mediaType = g.type === 'video' ? 'video' : 'image';
                const mediaStatus = g.status || 'ready';
                const rawUrl = g.url || g.originalUrl || g.file || (g.filename ? `/uploads/${g.filename}` : '');
                const rawThumbnail = g.thumbnailUrl || (g.thumbnailFilename ? `/uploads/${g.thumbnailFilename}` : '') || rawUrl;
                const fileRef = String(rawUrl || g.filename || '').toLowerCase();
                const isHeicLike = /\.(heic|heif)(\?|#|$)/i.test(fileRef);
                const supportsLightbox = mediaType === 'video' ? true : !isHeicLike;

                return {
                    ...g,
                    type: mediaType,
                    status: mediaStatus,
                    urlResolved: normalizeImageUrl(rawUrl),
                    thumbnailUrlResolved: normalizeImageUrl(rawThumbnail),
                    supportsLightbox,
                };
            })
            .filter((g) => {
                if (!g.urlResolved) return false;
                return g.status === 'ready';
            })
            .sort((a, b) => {
                const orderA = typeof a.order === 'number' ? a.order : Number.MAX_SAFE_INTEGER;
                const orderB = typeof b.order === 'number' ? b.order : Number.MAX_SAFE_INTEGER;

                if (orderA !== orderB) return orderA - orderB;

                const timeA = new Date(a.uploadedAt || 0).getTime();
                const timeB = new Date(b.uploadedAt || 0).getTime();
                return timeA - timeB;
            });

        const normalizedProgram = {
            ...program,
            imageUrlResolved: normalizeImageUrl(program.imageUrl),
            heroImagePositionX: normalizeImagePosition(program.heroImagePositionX),
            heroImagePositionY: normalizeImagePosition(program.heroImagePositionY),
            gallery,
            specialFeatures: program.specialFeatures || '',
            ticketingEnabled: Boolean(program.ticketingEnabled),
            ticketPrice: Number(program.ticketPrice || 0),
            ticketCurrency: normalizeCurrency(program.ticketCurrency || 'NOK', 'NOK'),
            seatCapacity: Number(program.seatCapacity || 0) > 0 ? Number(program.seatCapacity) : null,
            seatsSold: Math.max(0, Number(program.seatsSold || 0)),
        };

        const hasCapacityLimit = Number.isFinite(normalizedProgram.seatCapacity) && normalizedProgram.seatCapacity > 0;
        const availableSeats = hasCapacityLimit
            ? Math.max(normalizedProgram.seatCapacity - normalizedProgram.seatsSold, 0)
            : null;
        const isSoldOut = hasCapacityLimit ? availableSeats === 0 : false;

        let ticketPriceDisplay = '';
        if (normalizedProgram.ticketPrice > 0) {
            try {
                ticketPriceDisplay = new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: normalizedProgram.ticketCurrency,
                    minimumFractionDigits: 2,
                }).format(normalizedProgram.ticketPrice);
            } catch (error) {
                ticketPriceDisplay = `${normalizedProgram.ticketPrice.toFixed(2)} ${normalizedProgram.ticketCurrency}`;
            }
        }

        normalizedProgram.availableSeats = availableSeats;
        normalizedProgram.isSoldOut = isSoldOut;
        normalizedProgram.ticketPriceDisplay = ticketPriceDisplay;

        const visitorCountry = String(req.headers['cf-ipcountry'] || '').trim().toUpperCase();
        const visitorCurrency = getCurrencyFromCountry(visitorCountry, normalizedProgram.ticketCurrency);
        normalizedProgram.visitorCountry = visitorCountry || 'Unknown';
        normalizedProgram.visitorCurrency = visitorCurrency;
        normalizedProgram.showConvertedPrice = false;
        normalizedProgram.convertedTicketPriceDisplay = '';

        if (normalizedProgram.ticketPrice > 0 && visitorCurrency !== normalizedProgram.ticketCurrency) {
            const convertedPrice = await convertAmount(
                normalizedProgram.ticketPrice,
                normalizedProgram.ticketCurrency,
                visitorCurrency
            );

            if (Number.isFinite(convertedPrice) && convertedPrice > 0) {
                try {
                    normalizedProgram.convertedTicketPriceDisplay = new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: visitorCurrency,
                        minimumFractionDigits: 2,
                    }).format(convertedPrice);
                } catch (error) {
                    normalizedProgram.convertedTicketPriceDisplay = `${convertedPrice.toFixed(2)} ${visitorCurrency}`;
                }

                normalizedProgram.showConvertedPrice = true;
            }
        }

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
            checkoutStatus,
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

        const cmsBaseUrl = process.env.CMS_BASE_URL || '';
        const normalizeImageUrl = (url) => normalizeImageUrlWithBase(url, cmsBaseUrl);

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

exports.blogsList = async (req, res) => {
    try {
        const [settings, blogs, pages] = await Promise.all([
            Settings.findOne({ key: 'main' }).lean(),
            Blog.find({ $or: [{ isActive: true }, { isActive: { $exists: false } }] })
                .sort({ publishedAt: -1, createdAt: -1 })
                .lean(),
            Page.find({}).lean(),
        ]);

        const cmsBaseUrl = process.env.CMS_BASE_URL || '';
        const normalizeImageUrl = (url) => normalizeImageUrlWithBase(url, cmsBaseUrl);
        const stripHtml = (value) => String(value || '').replace(/<[^>]*>/g, '').trim();

        const normalizedBlogs = (blogs || []).map((blog) => ({
            ...blog,
            coverImageUrlResolved: normalizeImageUrl(blog.coverImageUrl),
            excerptText: stripHtml(blog.excerpt || blog.content || '').slice(0, 180),
        }));

        const pagesByKey = (pages || []).reduce((acc, p) => {
            acc[p.key] = p;
            return acc;
        }, {});

        const normalizedSettings = {
            ...(settings || {}),
            logoUrl: normalizeImageUrl(settings?.logoUrl),
        };

        return res.render('blogs', {
            settings: normalizedSettings,
            blogs: normalizedBlogs,
            blogPosts: normalizedBlogs,
            pages: pagesByKey,
        });
    } catch (error) {
        console.error('Error loading blogs list:', error);
        return res.status(500).render('error', {
            settings: {},
            error: 'Failed to load blogs',
            message: error.message,
        });
    }
};

exports.galleryPage = async (req, res) => {
    try {
        const requestedPage = Number.parseInt(String(req.query.page || '1'), 10);
        const perPage = 12;
        let currentPage = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

        const [settings, blogs, pages, programs] = await Promise.all([
            Settings.findOne({ key: 'main' }).lean(),
            Blog.find({ $or: [{ isActive: true }, { isActive: { $exists: false } }] })
                .sort({ publishedAt: -1, createdAt: -1 })
                .lean(),
            Page.find({}).lean(),
            Program.find({ isActive: true }).sort({ createdAt: -1 }).lean(),
        ]);

        const cmsBaseUrl = process.env.CMS_BASE_URL || '';
        const normalizeImageUrl = (url) => normalizeImageUrlWithBase(url, cmsBaseUrl);

        const normalizedBlogs = (blogs || []).map((blog) => ({
            ...blog,
            coverImageUrlResolved: normalizeImageUrl(blog.coverImageUrl),
        }));

        const pagesByKey = (pages || []).reduce((acc, p) => {
            acc[p.key] = p;
            return acc;
        }, {});

        const normalizedSettings = {
            ...(settings || {}),
            logoUrl: normalizeImageUrl(settings?.logoUrl),
        };

        const galleryMedia = extractProgramGalleryMedia(programs, normalizeImageUrl);
        const totalItems = galleryMedia.length;
        const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
        if (currentPage > totalPages) currentPage = totalPages;
        const startIndex = (currentPage - 1) * perPage;
        const paginatedMedia = galleryMedia.slice(startIndex, startIndex + perPage);

        const paginationItems = buildCondensedPaginationItems(currentPage, totalPages);

        const prevPageHref = currentPage > 1 ? `/gallery?page=${currentPage - 1}` : null;
        const nextPageHref = currentPage < totalPages ? `/gallery?page=${currentPage + 1}` : null;

        return res.render('gallery', {
            settings: normalizedSettings,
            blogPosts: normalizedBlogs,
            pages: pagesByKey,
            galleryMedia: paginatedMedia,
            paginationItems,
            currentPage,
            totalPages,
            prevPageHref,
            nextPageHref,
        });
    } catch (error) {
        console.error('Error loading gallery page:', error);
        return res.status(500).render('error', {
            settings: {},
            error: 'Failed to load gallery',
            message: error.message,
        });
    }
};

exports.contactUs = async (req, res) => {
    try {
        const [settings, blogs, pages] = await Promise.all([
            Settings.findOne({ key: 'main' }).lean(),
            Blog.find({ $or: [{ isActive: true }, { isActive: { $exists: false } }] })
                .sort({ publishedAt: -1, createdAt: -1 })
                .lean(),
            Page.find({}).lean(),
        ]);

        const cmsBaseUrl = process.env.CMS_BASE_URL || '';
        const normalizeImageUrl = (url) => normalizeImageUrlWithBase(url, cmsBaseUrl);

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

        return res.render('contact', {
            settings: normalizedSettings,
            blogPosts: normalizedBlogs,
            pages: pagesByKey,
            turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || '',
        });
    } catch (error) {
        console.error('Error loading contact page:', error);
        return res.status(500).render('error', {
            settings: {},
            error: 'Failed to load contact page',
            message: error.message,
        });
    }
};

exports.advanceTourBooking = async (req, res) => {
    try {
        const checkoutStatus = ['success', 'cancel'].includes(String(req.query.checkout || ''))
            ? String(req.query.checkout)
            : null;

        const [settings, blogs, pages, advanceTour] = await Promise.all([
            Settings.findOne({ key: 'main' }).lean(),
            Blog.find({ $or: [{ isActive: true }, { isActive: { $exists: false } }] })
                .sort({ publishedAt: -1, createdAt: -1 })
                .lean(),
            Page.find({}).lean(),
            getAdvanceTourStats(),
        ]);

        const cmsBaseUrl = process.env.CMS_BASE_URL || '';
        const normalizeImageUrl = (url) => normalizeImageUrlWithBase(url, cmsBaseUrl);

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

        return res.render('register', {
            settings: normalizedSettings,
            blogPosts: normalizedBlogs,
            pages: pagesByKey,
            checkoutStatus,
            advanceTour,
        });
    } catch (error) {
        console.error('Error loading advance tour booking page:', error);
        return res.status(500).render('error', {
            settings: {},
            error: 'Failed to load booking page',
            message: error.message,
        });
    }
};

exports.aboutUs = async (req, res) => {
    try {
        const [settings, blogs, pages, teamMembersRaw, programs] = await Promise.all([
            Settings.findOne({ key: 'main' }).lean(),
            Blog.find({ $or: [{ isActive: true }, { isActive: { $exists: false } }] })
                .sort({ publishedAt: -1, createdAt: -1 })
                .lean(),
            Page.find({}).lean(),
            TeamMember.find({}).sort({ sortOrder: -1, createdAt: -1, _id: -1 }).lean(),
            Program.find({ $or: [{ isActive: true }, { isActive: { $exists: false } }] }, { imageUrl: 1, gallery: 1, title: 1 }).lean(),
        ]);

        const cmsBaseUrl = process.env.CMS_BASE_URL || '';
        const normalizeImageUrl = (url) => normalizeImageUrlWithBase(url, cmsBaseUrl);

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

        const teamMembers = normalizeTeamMembers(teamMembersRaw, normalizeImageUrl);

        // Collect gallery images from program.gallery
        const programImages = [];
        for (const p of (programs || [])) {
            const gallery = Array.isArray(p.gallery) ? p.gallery : [];
            for (const item of gallery) {
                if ((item?.type || 'image') === 'video') continue;
                if ((item?.status || 'ready') !== 'ready') continue;
                const u = item?.url || item?.originalUrl || (item?.filename ? `/uploads/${item.filename}` : '');
                const resolved = u ? normalizeImageUrl(u) : null;
                if (resolved && !programImages.includes(resolved)) programImages.push(resolved);
            }
        }
        // Shuffle and pick up to 3
        for (let i = programImages.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [programImages[i], programImages[j]] = [programImages[j], programImages[i]];
        }
        const aboutImages = programImages.slice(0, 3);

        return res.render('about-us', {
            settings: normalizedSettings,
            blogPosts: normalizedBlogs,
            pages: pagesByKey,
            teamMembers,
            aboutImages,
        });
    } catch (error) {
        console.error('Error loading about us page:', error);
        return res.status(500).render('error', {
            settings: {},
            error: 'Failed to load About page',
            message: error.message,
        });
    }
};
