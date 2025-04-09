const express = require('express');
const router = express.Router();
const indexController = require('../controllers/indexController');
const viewsController = require('../controllers/viewsController');

// Main index route
router.get("/", indexController.index);

// About page
router.get("/about", viewsController.about);

// Blog pages
router.get("/blog", viewsController.blog);
router.get("/blog-classic", viewsController.blogClassic);
router.get("/blog-sidebar", viewsController.blogSidebar);
router.get("/blog-detail", viewsController.blogDetail);

// Contact page
router.get("/contact", viewsController.contact);

// FAQ page
router.get("/faq", viewsController.faq);

// Gallery page
router.get("/gallery", viewsController.gallery);

// Program pages
router.get("/program", viewsController.program);
router.get("/program-detail", viewsController.programDetail);

// Authentication pages
router.get("/register", viewsController.register);
router.get("/reset-password", viewsController.resetPassword);

// Team pages
router.get("/team", viewsController.team);
router.get("/team-detail", viewsController.teamDetail);

// Testimonial page
router.get("/testimonial", viewsController.testimonial);

// 404 page - should be at the end
router.get("/not-found", viewsController.notFound);

module.exports = router;