const express = require('express');
const router = express.Router();
const indexController = require('../controllers/indexController');

router.get('/', indexController.index);
router.get('/about-us', indexController.aboutUs);
router.get('/about-us.html', indexController.aboutUs);
router.get('/blog/:slug', indexController.blogPost);
router.get('/program/:id', indexController.programDetail);
router.get('/contact-us', indexController.contactUs);
router.get('/faq', indexController.faqPage);
router.get('/terms-and-conditions', indexController.termsPage);
router.get('/privacy-policy', indexController.privacyPage);
router.get('/cookies-policy', indexController.cookiesPage);
router.get('/register', indexController.advanceTourBooking);
router.get('/advance-tour-booking', indexController.advanceTourBooking);
router.get('/advance-tour-registration', indexController.advanceTourBooking);
router.get('/page/:key', indexController.pageView);
router.get('/programs', indexController.programsList);
router.get('/blogs', indexController.blogsList);
router.get('/gallery', indexController.galleryPage);

module.exports = router;
