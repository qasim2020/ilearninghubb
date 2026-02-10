const express = require('express');
const router = express.Router();
const indexController = require('../controllers/indexController');

router.get('/', indexController.index);
router.get('/blog/:slug', indexController.blogPost);
router.get('/program/:id', indexController.programDetail);
router.get('/page/:key', indexController.pageView);
router.get('/programs', indexController.programsList);

module.exports = router;