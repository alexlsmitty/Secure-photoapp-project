const csrf = require('csurf');
const cookieParser = require('cookie-parser');

// CSRF protection middleware
const csrfProtection = csrf({ cookie: true });

// Cookie Parser middleware
const parseFormData = cookieParser();

module.exports = { csrfProtection, parseFormData };