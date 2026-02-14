const nodemailer = require('nodemailer');
const Ticket = require('../models/Ticket');
const Subscription = require('../models/Subscription');
const Settings = require('../models/Settings');

const buildRedirectUrl = (req, status) => {
    const referer = req.get('referer') || '/';
    try {
        const url = new URL(referer, `http://${req.headers.host}`);
        url.searchParams.set('message', status);
        return url.pathname + url.search;
    } catch (err) {
        return `/?message=${status}`;
    }
};

const isAjaxRequest = (req) => {
    const requestedWith = req.headers['x-requested-with'];
    if (requestedWith && requestedWith.toLowerCase() === 'xmlhttprequest') return true;
    const accept = req.headers.accept || '';
    return accept.includes('application/json');
};

const sendResponse = (req, res, statusCode, payload, redirectStatus) => {
    if (isAjaxRequest(req)) {
        return res.status(statusCode).json(payload);
    }
    return res.redirect(buildRedirectUrl(req, redirectStatus));
};

const normalizeName = (data) => {
    if (data.username) return data.username.trim();
    if (data.name) return data.name.trim();
    const combined = [data.firstname, data.lastname].filter(Boolean).join(' ').trim();
    return combined;
};

exports.sendMail = async (req, res) => {
    const data = req.body || {};
    const name = normalizeName(data);
    const email = (data.email || '').trim();
    const phone = (data.phone || '').trim();

    if (!name || !email) {
        return sendResponse(req, res, 400, { success: false, message: 'missing' }, 'missing');
    }

    try {
        const ticket = await Ticket.create({
            name,
            email,
            phone,
            message: (data.message || '').trim(),
            service: (data.service || '').trim(),
            country: (data.country || '').trim(),
            childName: (data.firstname || '').trim(),
            guardianName: (data.lastname || '').trim(),
            childAge: (data.childAge || '').trim(),
            medicalConditions: (data.medicalConditions || '').trim(),
            source: (data.source || 'contact-form').trim(),
            formData: data,
        });

        const settings = await Settings.findOne({ key: 'main' }).lean();

        if (!settings?.emailHost || !settings?.emailPort || !settings?.emailUser || !settings?.emailPass) {
            throw new Error('Email settings missing in Settings collection.');
        }

        const buildTransport = (portOverride, secureOverride) => {
            const port = Number(portOverride ?? settings.emailPort);
            const secure = typeof secureOverride === 'boolean'
                ? secureOverride
                : (port === 465 ? true : Boolean(settings.emailSecure));

            return nodemailer.createTransport({
                host: settings.emailHost,
                port,
                secure,
                requireTLS: !secure,
                ignoreTLS: false,
                auth: {
                    user: settings.emailUser,
                    pass: settings.emailPass,
                },
                tls: {
                    rejectUnauthorized: false,
                },
                connectionTimeout: 10000,
                greetingTimeout: 10000,
                socketTimeout: 20000,
            });
        };

        const transporter = buildTransport();

        const fromAddress = settings.emailFromAddress || settings.emailUser;
        const fromName = settings.emailFromName || 'iLearningHubb';

        const subject = `New Ticket: ${name}`;

        const lines = [
            `Ticket ID: ${ticket._id}`,
            `Name: ${name}`,
            `Email: ${email}`,
            phone ? `Phone: ${phone}` : null,
            data.firstname ? `Child Name: ${data.firstname}` : null,
            data.lastname ? `Guardian Name: ${data.lastname}` : null,
            data.childAge ? `Child Age: ${data.childAge}` : null,
            data.medicalConditions ? `Medical Conditions/Allergies: ${data.medicalConditions}` : null,
            data.country ? `Country: ${data.country}` : null,
            data.service ? `Service: ${data.service}` : null,
            data.message ? `Message: ${data.message}` : null,
            data.source ? `Source: ${data.source}` : null,
        ].filter(Boolean);

        const recipients = (Array.isArray(settings.ticketEmails) && settings.ticketEmails.length)
            ? settings.ticketEmails
            : (settings.emailToAddress ? [settings.emailToAddress] : ['qasimali24@gmail.com']);

        const mailOptions = {
            from: `${fromName} <${fromAddress}>`,
            to: recipients,
            replyTo: email,
            subject,
            text: lines.join('\n'),
            html: lines.map((line) => `<p>${line}</p>`).join(''),
        };

        // Send to each recipient individually to avoid exposing other recipients
        const sendToRecipient = async (recipient) => {
            const opts = Object.assign({}, mailOptions, { to: recipient });
            try {
                await transporter.sendMail(opts);
            } catch (sendError) {
                const isTimeout = sendError?.code === 'ETIMEDOUT'
                    || /Greeting never received/i.test(sendError?.message || '');

                if (!isTimeout) {
                    console.error('Error sending email to a recipient:', sendError);
                    return;
                }

                const currentPort = Number(settings.emailPort) || 587;
                const fallbackPort = currentPort === 465 ? 587 : 465;
                const fallbackSecure = fallbackPort === 465;

                const fallbackTransport = buildTransport(fallbackPort, fallbackSecure);
                try {
                    await fallbackTransport.sendMail(opts);
                } catch (fallbackErr) {
                    console.error('Fallback send failed for a recipient:', fallbackErr);
                }
            }
        };

        for (const r of recipients) {
            // sequential send to avoid disclosing recipient list and reduce rate issues
            // errors are logged generically (without recipient email)
            // continue sending to remaining recipients even if one fails
            // eslint-disable-next-line no-await-in-loop
            await sendToRecipient(r);
        }

        return sendResponse(
            req,
            res,
            200,
            { success: true, ticketId: ticket._id },
            'success'
        );
    } catch (err) {
        console.error('Error sending email or creating ticket:', err);
        return sendResponse(
            req,
            res,
            500,
            { success: false, message: 'error' },
            'error'
        );
    }
};

exports.subscribe = async (req, res) => {
    try {
        const email = String((req.body.email || req.body.search-field || '').trim()).toLowerCase();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ success: false, message: 'missing' });
        }

        // upsert subscription (ignore duplicate errors)
        try {
            await Subscription.updateOne({ email }, { $setOnInsert: { email, source: 'footer-subscribe' } }, { upsert: true });
        } catch (e) {
            // ignore unique constraint errors
        }

        return res.json({ success: true });
    } catch (err) {
        console.error('Error saving subscription:', err);
        return res.status(500).json({ success: false, message: 'error' });
    }
};