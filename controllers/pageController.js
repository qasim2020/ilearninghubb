const mongoose = require('mongoose');
const createModel = require('../modules/createModel');
const { renderPage } = require('./controllerUtils');
const Event = require('../models/events');

const createPageController = (template, statusCode = 200) => {
    return async (req, res) => {
        await renderPage(req, res, template, {}, statusCode);
    };
};

exports.about = createPageController('about');
exports.contact = createPageController('contact');
exports.faq = createPageController('faq');
exports.gallery = createPageController('gallery');

exports.blog = createPageController('blog');
exports.blogClassic = createPageController('blog-classic');
exports.blogSidebar = createPageController('blog-sidebar');
exports.blogDetail = createPageController('blog-detail');

exports.program = createPageController('program');
exports.programDetail = createPageController('program-detail');

exports.register = createPageController('register');
exports.resetPassword = createPageController('reset-password');

exports.team = createPageController('team');
exports.teamDetail = createPageController('team-detail');

exports.testimonial = createPageController('testimonial');

exports.notFound = createPageController('not-found', 404);

exports.eventDetail = async (req, res) => {
    try {
        let event = null;
        let otherEvents = [];
        
        // Get the event ID from query parameters
        const eventId = req.query.id;
        
        if (eventId) {
            // Find the specific event
            event = await Event.findById(eventId).lean();
            
            if (event) {
                // Generate extended description if not available
                if (!event.extendedDescription) {
                    event.extendedDescription = generateExtendedDescription(event);
                }
                
                // Find other recent events (excluding current one)
                otherEvents = await Event.find({ 
                    _id: { $ne: eventId },
                    featured: true 
                })
                .sort({ date: -1 })
                .limit(3)
                .lean();
            }
        }
        
        // Render the page with event data
        await renderPage(req, res, 'event-detail', { 
            event, 
            otherEvents,
            pageTitle: event ? event.title : 'Event Details'
        });
    } catch (error) {
        console.error('Error in event detail controller:', error);
        await renderPage(req, res, 'event-detail', { error: 'Failed to load event details' });
    }
};

/**
 * Helper function to generate extended descriptions for events
 */
function generateExtendedDescription(event) {
    const baseDescription = event.description || '';
    
    // Default extended descriptions based on event types
    const descriptions = {
        workshop: `This interactive workshop provides children with hands-on experience in a supportive, 
                  engaging environment. Participants will develop practical skills through guided activities, 
                  collaborative challenges, and expert instruction. Perfect for curious minds looking to explore 
                  new interests or deepen existing ones.`,
                  
        camp: `Our camp offers children a comprehensive experience combining fun activities with educational 
              opportunities. In a safe and supportive setting, participants build confidence, develop social skills, 
              and create lasting memories. Each day is carefully structured to balance learning with recreation, 
              ensuring a well-rounded experience.`,
              
        competition: `This exciting competition challenges participants to showcase their skills and creativity. 
                     Through friendly rivalry, children learn the value of preparation, perseverance, and 
                     sportsmanship. Whether they're seasoned competitors or first-time participants, all 
                     children will benefit from this growth-oriented experience.`,
                     
        exhibition: `Our exhibition celebrates the incredible achievements and creative works of young 
                    participants. Visitors will be amazed by the talent, innovation, and dedication on display. 
                    For the young creators, this is an opportunity to receive recognition for their hard work 
                    and gain confidence in sharing their passions with a wider audience.`,
                    
        // Default description if event type not specified
        default: `This special event has been designed to provide an enriching, memorable experience for 
                 all participants. Through a combination of engaging activities, expert guidance, and 
                 a supportive atmosphere, children will develop valuable skills while having fun. Our 
                 dedicated team ensures that every aspect of the event is both educational and enjoyable.`
    };
    
    // Determine which extended description to use based on title keywords
    const title = event.title.toLowerCase();
    let extendedType = 'default';
    
    if (title.includes('workshop') || title.includes('class')) {
        extendedType = 'workshop';
    } else if (title.includes('camp') || title.includes('retreat')) {
        extendedType = 'camp';
    } else if (title.includes('competition') || title.includes('contest') || title.includes('challenge')) {
        extendedType = 'competition';
    } else if (title.includes('exhibition') || title.includes('showcase') || title.includes('display')) {
        extendedType = 'exhibition';
    }
    
    return baseDescription + ' ' + descriptions[extendedType];
}

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