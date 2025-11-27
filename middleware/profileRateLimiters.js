const rateLimit = require('express-rate-limit');

// Profile update rate limiter - 10 updates per hour
const profileUpdateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Too many profile updates. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Password change rate limiter - 3 changes per day
const passwordChangeLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 3,
  message: 'Too many password change attempts. Please try again tomorrow.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Account deletion rate limiter - 1 attempt per day
const accountDeleteLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 1,
  message: 'Account deletion can only be attempted once per day.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Photo privacy toggle limiter - 20 changes per hour
const privacyToggleLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: 'Too many privacy changes. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  profileUpdateLimiter,
  passwordChangeLimiter,
  accountDeleteLimiter,
  privacyToggleLimiter
};
