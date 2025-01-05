const express = require('express');
const router = express.Router();
const controllers = require('../controllers/indexController');

router.get("/", controllers.index);

module.exports = router;