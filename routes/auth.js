const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { loginLimiter, signupLimiter } = require('../middleware/rateLimitMiddleware');
const authMiddleware = require('../middleware/authMiddleware');
const { blacklistToken } = require('../config/tokenBlacklist');
const router = express.Router();

// Helper function to generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// POST /auth/signup
// Session Fixation Prevention:
// - Generates a NEW JWT token on signup (not reusing old sessions)
// - Each new session gets a fresh token with current timestamp
// - Tokens expire after 7 days, requiring re-authentication
router.post('/auth/signup', signupLimiter, async (req, res) => {
  try {
    const { email, username, password } = req.body;

    // Validation
    if (!email || !username || !password) {
      return res.status(400).json({ error: 'All fields required' });
    }

    // Check if user already exists
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create new user
    user = new User({ email, username, password });
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Set secure HttpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: true, // Only send over HTTPS
      sameSite: 'strict', // CSRF protection
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: { id: user._id, email: user.email, username: user.username, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /auth/login
// Session Fixation Prevention:
// - Generates a NEW JWT token on each login
// - This ensures old/compromised tokens cannot be reused
// - Previous sessions are invalidated by getting new tokens
// - Combined with token blacklist on logout for complete session control
router.post('/auth/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Compare passwords
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user._id);

    // Set secure HttpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    // Customize response based on user role
    const responseMessage = user.role === 'Admin' 
      ? '🔒 Admin login successful - Access admin dashboard at /admin/dashboard'
      : 'Login successful';
    
    res.json({
      message: responseMessage,
      token,
      user: { id: user._id, email: user.email, username: user.username, role: user.role },
      isAdmin: user.role === 'Admin',
      adminDashboard: user.role === 'Admin' ? '/admin/dashboard' : null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /auth/logout
// Session Fixation Prevention:
// - Requires authentication to ensure only the actual user can log out
// - Invalidates the current token by adding it to the blacklist
// - Clears the HttpOnly cookie
// - Prevents old tokens from being reused even if compromised
router.post('/auth/logout', authMiddleware, (req, res) => {
  try {
    // Get the token from Authorization header
    const token = req.headers.authorization?.split(' ')[1];
    
    // Add token to blacklist to prevent reuse (session fixation prevention)
    if (token) {
      blacklistToken(token);
    }
    
    // Clear the HttpOnly cookie as well
    res.clearCookie('token', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict'
    });
    
    res.json({ message: 'Logged out successfully. Session invalidated.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
