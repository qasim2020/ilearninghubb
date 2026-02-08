const { renderPage } = require('./controllerUtils');

exports.sendMail = async (req, res) => {
    const { username, email, phone, service, message } = req.body;

    if (!username || !email || !message) {
        return res.redirect('/contact.html?message=missing');
    }

};