const express = require('express');
const router = express.Router();
const emailController = require('../controllers/emailController');

router.post('/sendemail.php', emailController.sendMail);

module.exports = router;