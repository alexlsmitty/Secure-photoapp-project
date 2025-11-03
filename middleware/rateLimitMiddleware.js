const rateLimit = require('express-rate-limit');

// Limit login attempts to 5 attempts per 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts, please try again later :)' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limit signup to 3 attempts per hour
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { error: 'Too many signup attempts, please try again later :)' },
});

module.exports = { loginLimiter, signupLimiter };