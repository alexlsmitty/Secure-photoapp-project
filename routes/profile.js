const express = require('express');
const router = express.Router();
const User = require('../models/User');
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

      // Check if email is being changed and if it's already taken
      if (email && email !== user.email) {
        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
          return res.status(400).json({ error: 'Email already in use' });
        }
        user.email = email;
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

// PUT /profile/password - Change password
router.put('/password', 
  authMiddleware, 
  passwordChangeLimiter, 
  validatePasswordChange, 
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user._id;

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

      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      console.error('Password change error:', error);
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
