const express = require('express');
const router = express.Router();
const emailController = require('../controllers/emailController');

router.post('/api/tickets', emailController.sendMail);
router.post('/api/subscribe', emailController.subscribe);

module.exports = router;