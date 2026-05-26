const Stripe = require('stripe');
const Program = require('../models/Program');
const Ticket = require('../models/Ticket');
const ADVANCE_TOUR_PRICE_NOK = 100;

function getStripeClient() {
    if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error('Missing STRIPE_SECRET_KEY');
    }
    return new Stripe(process.env.STRIPE_SECRET_KEY);
}

function parsePositiveInteger(value, fallback = 1) {
    const parsed = Number.parseInt(String(value || fallback), 10);
    if (!Number.isFinite(parsed) || parsed < 1) return fallback;
    return parsed;
}

function getBaseUrl(req) {
    const explicit = (process.env.SITE_URL || process.env.DOMAIN_URL || '').trim();
    if (explicit) {
        return explicit.replace(/\/+$/, '');
    }
    return `${req.protocol}://${req.get('host')}`;
}

function buildCapacityFilter(quantity) {
    return {
        $or: [
            { seatCapacity: null },
            { seatCapacity: { $exists: false } },
            {
                $expr: {
                    $lte: [
                        { $add: [{ $ifNull: ['$seatsSold', 0] }, quantity] },
                        '$seatCapacity',
                    ],
                },
            },
        ],
    };
}

exports.createCheckoutSession = async (req, res) => {
    try {
        const { programId } = req.body || {};
        const quantity = parsePositiveInteger(req.body?.quantity, 1);
        const customerName = String(req.body?.name || '').trim();
        const customerEmail = String(req.body?.email || '').trim().toLowerCase();
        const customerPhone = String(req.body?.phone || '').trim();

        if (!programId) {
            return res.status(400).json({ error: 'Program is required' });
        }

        if (!customerName || !customerEmail) {
            return res.status(400).json({ error: 'Name and email are required' });
        }

        if (quantity > 20) {
            return res.status(400).json({ error: 'Quantity cannot exceed 20 per checkout' });
        }

        const program = await Program.findById(programId).lean();
        if (!program || !program.ticketingEnabled) {
            return res.status(404).json({ error: 'Ticketing is not enabled for this program' });
        }

        const ticketPrice = Number(program.ticketPrice || 0);
        if (!Number.isFinite(ticketPrice) || ticketPrice <= 0) {
            return res.status(400).json({ error: 'Program ticket price is invalid' });
        }

        const seatCapacity = Number(program.seatCapacity || 0);
        const seatsSold = Number(program.seatsSold || 0);
        if (seatCapacity > 0) {
            const remainingSeats = Math.max(seatCapacity - seatsSold, 0);
            if (remainingSeats < quantity) {
                return res.status(409).json({ error: 'Not enough seats available', remainingSeats });
            }
        }

        const stripe = getStripeClient();
        const currency = String(program.ticketCurrency || 'NOK').toLowerCase();
        const amountInMinorUnit = Math.round(ticketPrice * 100);
        const baseUrl = getBaseUrl(req);

        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            payment_method_types: ['card'],
            customer_email: customerEmail,
            line_items: [
                {
                    quantity,
                    price_data: {
                        currency,
                        unit_amount: amountInMinorUnit,
                        product_data: {
                            name: `${program.title} Ticket`,
                            description: `Admission for ${program.title}`,
                        },
                    },
                },
            ],
            success_url: `${baseUrl}/program/${program._id}?checkout=success`,
            cancel_url: `${baseUrl}/program/${program._id}?checkout=cancel`,
            metadata: {
                programId: String(program._id),
                quantity: String(quantity),
                customerName,
                customerPhone,
            },
        });

        return res.json({
            sessionId: session.id,
            checkoutUrl: session.url,
        });
    } catch (error) {
        console.error('Error creating Stripe checkout session:', error);
        return res.status(500).json({ error: 'Failed to create checkout session' });
    }
};

exports.createAdvanceTourCheckoutSession = async (req, res) => {
    try {
        const customerName = String(req.body?.name || '').trim();
        const customerEmail = String(req.body?.email || '').trim().toLowerCase();
        const customerPhone = String(req.body?.phone || '').trim();
        const childrenNamesRaw = String(req.body?.childrenNames || '').trim();

        if (!customerName || !customerEmail) {
            return res.status(400).json({ error: 'Name and email are required' });
        }

        const childLines = childrenNamesRaw
            .split(/\r?\n|,/)
            .map((entry) => entry.trim())
            .filter(Boolean);
        const quantityFromNames = childLines.length;
        const quantity = parsePositiveInteger(req.body?.quantity, quantityFromNames || 1);

        if (quantity > 20) {
            return res.status(400).json({ error: 'Quantity cannot exceed 20 per checkout' });
        }

        const stripe = getStripeClient();
        const baseUrl = getBaseUrl(req);
        const amountInMinorUnit = ADVANCE_TOUR_PRICE_NOK * 100;

        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            payment_method_types: ['card'],
            customer_email: customerEmail,
            line_items: [
                {
                    quantity,
                    price_data: {
                        currency: 'nok',
                        unit_amount: amountInMinorUnit,
                        product_data: {
                            name: 'Advance Tour Booking',
                            description: 'Advance booking for upcoming iLearningHubb tour',
                        },
                    },
                },
            ],
            success_url: `${baseUrl}/advance-tour-booking?checkout=success`,
            cancel_url: `${baseUrl}/advance-tour-booking?checkout=cancel`,
            metadata: {
                bookingType: 'advance-tour',
                quantity: String(quantity),
                customerName,
                customerPhone,
                childrenNames: childLines.join(', '),
            },
        });

        return res.json({
            sessionId: session.id,
            checkoutUrl: session.url,
        });
    } catch (error) {
        console.error('Error creating advance tour checkout session:', error);
        return res.status(500).json({ error: 'Failed to create checkout session' });
    }
};

async function persistSuccessfulCheckout(session) {
    if (!session || session.payment_status !== 'paid') {
        return;
    }

    const checkoutSessionId = String(session.id || '');
    if (!checkoutSessionId) return;

    const exists = await Ticket.findOne({ checkoutSessionId }).lean();
    if (exists) return;

    const bookingType = String(session.metadata?.bookingType || '').trim();
    const programId = session.metadata?.programId;
    const quantity = parsePositiveInteger(session.metadata?.quantity, 1);

    if (bookingType === 'advance-tour') {
        const customerName = String(session.metadata?.customerName || '').trim()
            || String(session.customer_details?.name || '').trim()
            || String(session.customer_email || '').trim()
            || 'Stripe Customer';
        const customerEmail = String(session.customer_email || '').trim().toLowerCase();
        const customerPhone = String(session.metadata?.customerPhone || '').trim();
        const childrenNames = String(session.metadata?.childrenNames || '').trim();

        await Ticket.create({
            name: customerName,
            guardianName: customerName,
            childName: childrenNames,
            email: customerEmail || 'unknown@example.com',
            phone: customerPhone,
            source: 'advance-tour-booking',
            status: 'paid',
            paymentStatus: session.payment_status,
            checkoutSessionId,
            paymentIntentId: String(session.payment_intent || ''),
            stripeCustomerEmail: customerEmail,
            quantity,
            totalAmount: Number(session.amount_total || 0) / 100,
            currency: String(session.currency || '').toUpperCase(),
            formData: {
                stripeSession: checkoutSessionId,
                metadata: session.metadata || {},
                bookingType: 'advance-tour',
            },
        });
        return;
    }

    if (!programId) return;

    const updatedProgram = await Program.findOneAndUpdate(
        {
            _id: programId,
            ticketingEnabled: true,
            ...buildCapacityFilter(quantity),
        },
        {
            $inc: { seatsSold: quantity },
        },
        {
            new: true,
        }
    ).lean();

    if (!updatedProgram) {
        return;
    }

    const customerName = String(session.metadata?.customerName || '').trim()
        || String(session.customer_details?.name || '').trim()
        || String(session.customer_email || '').trim()
        || 'Stripe Customer';
    const customerEmail = String(session.customer_email || '').trim().toLowerCase();
    const customerPhone = String(session.metadata?.customerPhone || '').trim();

    await Ticket.create({
        name: customerName,
        email: customerEmail || 'unknown@example.com',
        phone: customerPhone,
        source: 'program-ticket-booking',
        status: 'paid',
        paymentStatus: session.payment_status,
        checkoutSessionId,
        paymentIntentId: String(session.payment_intent || ''),
        stripeCustomerEmail: customerEmail,
        programId: updatedProgram._id,
        quantity,
        totalAmount: Number(session.amount_total || 0) / 100,
        currency: String(session.currency || '').toUpperCase(),
        formData: {
            stripeSession: checkoutSessionId,
            metadata: session.metadata || {},
        },
    });
}

exports.handleStripeWebhook = async (req, res) => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
        return res.status(500).json({ error: 'Missing STRIPE_WEBHOOK_SECRET' });
    }

    const signature = req.headers['stripe-signature'];
    if (!signature) {
        return res.status(400).json({ error: 'Missing Stripe signature' });
    }

    try {
        const stripe = getStripeClient();
        const event = stripe.webhooks.constructEvent(req.rawBody, signature, webhookSecret);

        if (event.type === 'checkout.session.completed') {
            await persistSuccessfulCheckout(event.data.object);
        }

        return res.json({ received: true });
    } catch (error) {
        console.error('Stripe webhook verification failed:', error);
        return res.status(400).json({ error: 'Invalid webhook signature' });
    }
};
