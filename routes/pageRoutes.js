const express = require('express');
const router = express.Router();
const indexController = require('../controllers/indexController');

router.get('/', indexController.index);
router.get('/event-detail', (req,res) => {
    res.render('event-detail');
});

module.exports = router;