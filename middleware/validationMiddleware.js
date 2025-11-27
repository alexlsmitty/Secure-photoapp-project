const { body, validationResult } = require('express-validator');
const validator = require('validator');
const xss = require('xss');

// XSS sanitization options - strip all HTML tags
const xssOptions = {
  whiteList: {}, // No HTML tags allowed
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style']
};

// Middleware to check validation results
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: errors.array() 
    });
  }
  next();
};

// Sanitize text input - removes HTML and XSS attempts
const sanitizeText = (text) => {
  if (!text) return text;
  // First XSS clean, then trim
  return xss(text.trim(), xssOptions);
};

// Username validation rules
const validateUsername = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be 3-30 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens')
    .customSanitizer(sanitizeText),
  handleValidationErrors
];

// Email validation rules
const validateEmail = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail()
    .customSanitizer(sanitizeText),
  handleValidationErrors
];

// Password validation rules (strong password requirements)
const validatePassword = [
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain: uppercase, lowercase, number, and special character (@$!%*?&)'),
  handleValidationErrors
];

// Password change validation (requires old password)
const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain: uppercase, lowercase, number, and special character'),
  body('confirmPassword')
    .custom((value, { req }) => value === req.body.newPassword)
    .withMessage('Passwords do not match'),
  handleValidationErrors
];

// Bio validation rules
const validateBio = [
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio must be 500 characters or less')
    .customSanitizer(sanitizeText),
  handleValidationErrors
];

// Profile picture URL validation
const validateProfilePicture = [
  body('profilePicture')
    .optional()
    .trim()
    .custom((value) => {
      if (!value) return true; // Allow empty
      
      // Check if it's a valid URL
      if (!validator.isURL(value, { protocols: ['http', 'https'], require_protocol: true })) {
        throw new Error('Invalid URL format');
      }
      
      // Prevent javascript: and data: URLs (XSS prevention)
      if (value.toLowerCase().startsWith('javascript:') || value.toLowerCase().startsWith('data:')) {
        throw new Error('Invalid URL scheme');
      }
      
      // Check if it's an image URL (basic check)
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
      const hasImageExtension = imageExtensions.some(ext => value.toLowerCase().includes(ext));
      
      if (!hasImageExtension) {
        throw new Error('URL must point to an image file');
      }
      
      return true;
    })
    .customSanitizer(sanitizeText),
  handleValidationErrors
];

// Combined profile update validation
const validateProfileUpdate = [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be 3-30 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens')
    .customSanitizer(sanitizeText),
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail()
    .customSanitizer(sanitizeText),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio must be 500 characters or less')
    .customSanitizer(sanitizeText),
  body('profilePicture')
    .optional()
    .trim()
    .custom((value) => {
      if (!value) return true;
      
      if (!validator.isURL(value, { protocols: ['http', 'https'], require_protocol: true })) {
        throw new Error('Invalid URL format');
      }
      
      if (value.toLowerCase().startsWith('javascript:') || value.toLowerCase().startsWith('data:')) {
        throw new Error('Invalid URL scheme');
      }
      
      return true;
    })
    .customSanitizer(sanitizeText),
  handleValidationErrors
];

// Photo title validation
const validatePhotoTitle = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 100 })
    .withMessage('Title must be 100 characters or less')
    .customSanitizer(sanitizeText),
  handleValidationErrors
];

// Photo URL validation
const validatePhotoUrl = [
  body('url')
    .trim()
    .notEmpty()
    .withMessage('Photo URL is required')
    .custom((value) => {
      if (!validator.isURL(value, { protocols: ['http', 'https'], require_protocol: true })) {
        throw new Error('Invalid URL format');
      }
      
      // Prevent javascript: and data: URLs
      if (value.toLowerCase().startsWith('javascript:') || value.toLowerCase().startsWith('data:')) {
        throw new Error('Invalid URL scheme');
      }
      
      return true;
    })
    .customSanitizer(sanitizeText),
  handleValidationErrors
];

module.exports = {
  validateUsername,
  validateEmail,
  validatePassword,
  validatePasswordChange,
  validateBio,
  validateProfilePicture,
  validateProfileUpdate,
  validatePhotoTitle,
  validatePhotoUrl,
  handleValidationErrors,
  sanitizeText
};
