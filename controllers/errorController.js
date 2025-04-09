const { renderPage } = require('./controllerUtils');

/**
 * Handle 404 Not Found errors
 */
exports.notFound = async (req, res) => {
    await renderPage(req, res, 'not-found', {
        error: 'Page not found',
        message: 'The page you are looking for does not exist'
    }, 404);
};

/**
 * Handle 500 Server errors
 */
exports.serverError = async (req, res, err) => {
    console.error('Server error:', err);
    
    const errorData = {
        error: 'Server error',
        message: process.env.NODE_ENV === 'production' 
            ? 'Something went wrong on our end' 
            : err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack
    };
    
    await renderPage(req, res, 'error', errorData, 500);
};

/**
 * Handle validation errors
 */
exports.validationError = async (req, res, errors) => {
    await renderPage(req, res, 'error', {
        error: 'Validation error',
        message: 'There were validation errors with your request',
        errors
    }, 400);
}; 