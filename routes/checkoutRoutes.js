const express = require('express');
const router = express.Router();
const checkoutController = require('../controllers/checkoutController');

router.post('/api/checkout/session', checkoutController.createCheckoutSession);
router.post('/api/advance-tour/checkout/session', checkoutController.createAdvanceTourCheckoutSession);
router.post('/api/checkout/webhook', checkoutController.handleStripeWebhook);

module.exports = router;
