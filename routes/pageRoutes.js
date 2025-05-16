const express = require('express');
const router = express.Router();
const pageController = require('../controllers/pageController');
const indexController = require('../controllers/indexController');

router.get('/', indexController.index);
router.get("/about", pageController.about);
router.get("/blog", pageController.blog);
router.get("/blog-classic", pageController.blogClassic);
router.get("/blog-sidebar", pageController.blogSidebar);
router.get("/blog-detail", pageController.blogDetail);
router.get("/contact", pageController.contact);
router.get("/faq", pageController.faq);
router.get("/gallery", pageController.gallery);
router.get("/program", pageController.program);
router.get("/program-detail", pageController.programDetail);
router.get("/event-detail", pageController.eventDetail);
router.get("/register", pageController.register);
router.get("/reset-password", pageController.resetPassword);
router.get("/team", pageController.team);
router.get("/team-detail", pageController.teamDetail);
router.get("/testimonial", pageController.testimonial);
router.get("/not-found", pageController.notFound);

module.exports = router;