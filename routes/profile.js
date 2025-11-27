const express = require('express');
const router = express.Router();
const User = require('../models/User');
const VerificationToken = require('../models/VerificationToken');
const authMiddleware = require('../middleware/authMiddleware');
const {
  validateProfileUpdate,
  validatePasswordChange
} = require('../middleware/validationMiddleware');
const {
  profileUpdateLimiter,
  passwordChangeLimiter,
  accountDeleteLimiter
} = require('../middleware/profileRateLimiters');
const { addToBlacklist } = require('../config/tokenBlacklist');
const { sendVerificationEmail } = require('../utils/emailService');

// GET /profile - Get current user's profile
router.get('/', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password'); // Exclude password from response
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if account is deleted
    if (user.accountDeletedAt) {
      return res.status(403).json({ error: 'Account has been deleted' });
    }

    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        bio: user.bio,
        profilePicture: user.profilePicture,
        createdAt: user.createdAt,
        lastPasswordChange: user.lastPasswordChange
      }
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /profile - Update user profile
router.put('/', 
  authMiddleware, 
  profileUpdateLimiter, 
  validateProfileUpdate, 
  async (req, res) => {
    try {
      const { username, email, bio, profilePicture } = req.body;
      const userId = req.user._id;

      // Find current user
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Check if account is deleted
      if (user.accountDeletedAt) {
        return res.status(403).json({ error: 'Account has been deleted' });
      }

      // Check if username is being changed and if it's already taken
      if (username && username !== user.username) {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
          return res.status(400).json({ error: 'Username already taken' });
        }
        user.username = username;
      }

      // Email changes now require verification - redirect to dedicated endpoint
      if (email && email !== user.email) {
        return res.status(400).json({
          error: 'Email changes require verification. Please use the email change feature with verification codes.'
        });
      }

      // Update bio if provided
      if (bio !== undefined) {
        user.bio = bio;
      }

      // Update profile picture if provided
      if (profilePicture !== undefined) {
        user.profilePicture = profilePicture;
      }

      await user.save();

      res.json({
        message: 'Profile updated successfully',
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          bio: user.bio,
          profilePicture: user.profilePicture,
          createdAt: user.createdAt
        }
      });
    } catch (error) {
      console.error('Profile update error:', error);
      
      // Handle duplicate key errors
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        return res.status(400).json({ error: `${field} already exists` });
      }
      
      res.status(500).json({ error: 'Server error' });
    }
});

// POST /profile/request-password-verification - Request verification code for password change
router.post('/request-password-verification', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.accountDeletedAt) {
      return res.status(403).json({ error: 'Account has been deleted' });
    }

    // Generate verification token
    const token = await VerificationToken.createToken(
      user._id,
      user.email,
      'password-change'
    );

    // Send verification email
    await sendVerificationEmail(user.email, token, 'password-change');

    res.json({
      message: 'Verification code sent to your email',
      email: user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3') // Mask email for privacy
    });
  } catch (error) {
    console.error('Request password verification error:', error);
    res.status(500).json({ error: 'Failed to send verification code' });
  }
});

// POST /profile/request-email-verification - Request verification code for email change
router.post('/request-email-verification', authMiddleware, async (req, res) => {
  try {
    const { newEmail } = req.body;

    if (!newEmail) {
      return res.status(400).json({ error: 'New email address is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.accountDeletedAt) {
      return res.status(403).json({ error: 'Account has been deleted' });
    }

    // Check if new email is already in use
    const existingUser = await User.findOne({ email: newEmail });
    if (existingUser) {
      return res.status(400).json({ error: 'Email address is already in use' });
    }

    // Check if trying to use same email
    if (user.email === newEmail) {
      return res.status(400).json({ error: 'New email must be different from current email' });
    }

    // Generate verification token for current email
    const token = await VerificationToken.createToken(
      user._id,
      user.email,
      'email-change',
      newEmail
    );

    // Send verification email to current email
    await sendVerificationEmail(user.email, token, 'email-change');

    res.json({
      message: 'Verification code sent to your current email',
      currentEmail: user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3')
    });
  } catch (error) {
    console.error('Request email verification error:', error);
    res.status(500).json({ error: 'Failed to send verification code' });
  }
});

// POST /profile/verify-code - Verify the code for password/email change
router.post('/verify-code', authMiddleware, async (req, res) => {
  try {
    const { code, type } = req.body;

    if (!code || !type) {
      return res.status(400).json({ error: 'Code and type are required' });
    }

    if (!['password-change', 'email-change', 'email-change-new'].includes(type)) {
      return res.status(400).json({ error: 'Invalid verification type' });
    }

    // Verify the token
    const verificationToken = await VerificationToken.verifyToken(
      req.user._id,
      code,
      type
    );

    if (!verificationToken) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    // For email change, send code to new email
    if (type === 'email-change') {
      const newToken = await VerificationToken.createToken(
        req.user._id,
        verificationToken.newEmail,
        'email-change-new',
        verificationToken.newEmail
      );

      await sendVerificationEmail(verificationToken.newEmail, newToken, 'email-change-new');

      // Consume the old token
      await VerificationToken.consumeToken(req.user._id, code, type);

      return res.json({
        message: 'Verification successful. Code sent to your new email address.',
        newEmail: verificationToken.newEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
        step: 'verify-new-email'
      });
    }

    res.json({
      message: 'Verification code is valid',
      verified: true
    });
  } catch (error) {
    console.error('Verify code error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /profile/password - Change password
router.put('/password', 
  authMiddleware, 
  passwordChangeLimiter, 
  validatePasswordChange, 
  async (req, res) => {
    try {
      const { currentPassword, newPassword, verificationCode } = req.body;
      const userId = req.user._id;

      // Require verification code
      if (!verificationCode) {
        return res.status(400).json({ error: 'Verification code is required. Please request a code first.' });
      }

      // Verify the code
      const verificationToken = await VerificationToken.verifyToken(
        userId,
        verificationCode,
        'password-change'
      );

      if (!verificationToken) {
        return res.status(400).json({ error: 'Invalid or expired verification code' });
      }

      // Find user
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Check if account is deleted
      if (user.accountDeletedAt) {
        return res.status(403).json({ error: 'Account has been deleted' });
      }

      // Verify current password
      const isMatch = await user.comparePassword(currentPassword);
      
      if (!isMatch) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      // Check if new password is same as current
      const isSamePassword = await user.comparePassword(newPassword);
      if (isSamePassword) {
        return res.status(400).json({ error: 'New password must be different from current password' });
      }

      // Update password (pre-save hook will hash it and update lastPasswordChange)
      user.password = newPassword;
      await user.save();

      // Consume the verification token
      await VerificationToken.consumeToken(userId, verificationCode, 'password-change');

      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      console.error('Password change error:', error);
      res.status(500).json({ error: 'Server error' });
    }
});

// PUT /profile/email - Change email (requires verification codes for both old and new email)
router.put('/email',
  authMiddleware,
  profileUpdateLimiter,
  async (req, res) => {
    try {
      const { newEmail, oldEmailCode, newEmailCode } = req.body;
      const userId = req.user._id;

      if (!newEmail || !oldEmailCode || !newEmailCode) {
        return res.status(400).json({
          error: 'New email address and both verification codes are required'
        });
      }

      // Verify the new email code
      const newEmailToken = await VerificationToken.verifyToken(
        userId,
        newEmailCode,
        'email-change-new'
      );

      if (!newEmailToken) {
        return res.status(400).json({ error: 'Invalid or expired new email verification code' });
      }

      // Verify the new email matches what was requested
      if (newEmailToken.newEmail !== newEmail) {
        return res.status(400).json({ error: 'Email address does not match verification request' });
      }

      // Find user
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Check if account is deleted
      if (user.accountDeletedAt) {
        return res.status(403).json({ error: 'Account has been deleted' });
      }

      // Check if email is still available
      const existingUser = await User.findOne({ email: newEmail });
      if (existingUser) {
        return res.status(400).json({ error: 'Email address is already in use' });
      }

      // Update email
      const oldEmail = user.email;
      user.email = newEmail;
      await user.save();

      // Consume both verification tokens
      await VerificationToken.consumeToken(userId, newEmailCode, 'email-change-new');

      res.json({
        message: 'Email address changed successfully',
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Email change error:', error);

      // Handle duplicate key errors
      if (error.code === 11000) {
        return res.status(400).json({ error: 'Email address is already in use' });
      }

      res.status(500).json({ error: 'Server error' });
    }
  });

// DELETE /profile - Delete account (soft delete)
router.delete('/', 
  authMiddleware, 
  accountDeleteLimiter, 
  async (req, res) => {
    try {
      const userId = req.user._id;
      const { password } = req.body;

      // Require password confirmation
      if (!password) {
        return res.status(400).json({ error: 'Password confirmation required to delete account' });
      }

      // Find user
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Check if account is already deleted
      if (user.accountDeletedAt) {
        return res.status(400).json({ error: 'Account is already deleted' });
      }

      // Verify password
      const isMatch = await user.comparePassword(password);
      
      if (!isMatch) {
        return res.status(401).json({ error: 'Password is incorrect' });
      }

      // Soft delete - mark account as deleted but don't remove from DB
      user.accountDeletedAt = Date.now();
      await user.save();

      // Blacklist the current token to log user out
      const token = req.cookies.token;
      if (token) {
        addToBlacklist(token);
      }

      // Clear the cookie
      res.clearCookie('token');

      res.json({ 
        message: 'Account deleted successfully',
        note: 'Your account has been deactivated. Contact support if you wish to restore it.'
      });
    } catch (error) {
      console.error('Account deletion error:', error);
      res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
