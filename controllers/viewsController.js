const mongoose = require('mongoose');
const createModel = require('../modules/createModel');
const { renderPage } = require('./controllerUtils');

/**
 * Factory function to create a simple page controller
 * @param {string} template - Template name to render
 * @param {number} statusCode - HTTP status code (optional)
 * @returns {Function} Controller function that renders the page
 */
const createPageController = (template, statusCode = 200) => {
    return async (req, res) => {
        await renderPage(req, res, template, {}, statusCode);
    };
};

// Main pages
exports.about = createPageController('about');
exports.contact = createPageController('contact');
exports.faq = createPageController('faq');
exports.gallery = createPageController('gallery');

// Blog pages
exports.blog = createPageController('blog');
exports.blogClassic = createPageController('blog-classic');
exports.blogSidebar = createPageController('blog-sidebar');
exports.blogDetail = createPageController('blog-detail');

// Program pages
exports.program = createPageController('program');
exports.programDetail = createPageController('program-detail');

// Authentication pages
exports.register = createPageController('register');
exports.resetPassword = createPageController('reset-password');

// Team pages
exports.team = createPageController('team');
exports.teamDetail = createPageController('team-detail');

// Testimonial page
exports.testimonial = createPageController('testimonial');

// Error page
exports.notFound = createPageController('not-found', 404);

/**
 * Advanced controllers can be defined individually when they need custom behavior
 * For example:
 */
exports.customPage = async (req, res) => {
    const customData = {
        // Additional custom data
        customInfo: 'This is custom information',
    };
    
    await renderPage(req, res, 'custom-page', customData);
}; 