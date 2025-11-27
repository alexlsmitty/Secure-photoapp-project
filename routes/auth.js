const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { loginLimiter, signupLimiter } = require('../middleware/rateLimitMiddleware');
const authMiddleware = require('../middleware/authMiddleware');
const { blacklistToken } = require('../config/tokenBlacklist');
const router = express.Router();

// Nodemailer transporter setup for password reset emails
// We are using a test account from ethereal.email.
// In a production environment, you would use your own SMTP server or a service like SendGrid.
const transporter = nodemailer.createTransport({
  host: 'smtp.ethereal.email',
  port: 587,
  auth: {
      user: 'maddison53@ethereal.email',
      pass: 'jn7jnAPss4f63QBp6D'
  }
});

// In-memory store for password reset tokens.
// In a production environment, you would use a database like Redis to store these tokens.
const passwordResetTokens = {};


// Helper function to generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '15m' });
};

// POST /auth/signup
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
    const refreshToken = await RefreshToken.createToken(user);

    // Set secure HttpOnly cookies
    res.cookie('token', token, {
      httpOnly: true,
      secure: true, // Only send over HTTPS
      sameSite: 'strict', // CSRF protection
      maxAge: 15 * 60 * 1000 // 15 minutes
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
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
    const refreshToken = await RefreshToken.createToken(user);

    // Set secure HttpOnly cookies
    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000 // 15 minutes
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
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
router.post('/auth/logout', authMiddleware, async (req, res) => {
  try {
    // Get the token from Authorization header
    const token = req.headers.authorization?.split(' ')[1];
    
    // Add token to blacklist to prevent reuse (session fixation prevention)
    if (token) {
      blacklistToken(token);
    }

    // Invalidate the refresh token
    const { refreshToken } = req.cookies;
    if (refreshToken) {
      await RefreshToken.deleteOne({ token: refreshToken });
    }
    
    // Clear the HttpOnly cookies
    res.clearCookie('token', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict'
    });
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict'
    });
    
    res.json({ message: 'Logged out successfully. Session invalidated.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /auth/refresh-token
router.post('/auth/refresh-token', async (req, res) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token not found.' });
  }

  try {
    const storedToken = await RefreshToken.findOne({ token: refreshToken }).populate('user');

    if (!storedToken || storedToken.expires < Date.now()) {
      return res.status(401).json({ error: 'Invalid or expired refresh token.' });
    }

    const user = storedToken.user;
    const newAccessToken = generateToken(user._id);

    res.cookie('token', newAccessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000 // 15 minutes
    });

    res.json({
      message: 'Token refreshed successfully',
      token: newAccessToken,
      user: { id: user._id, email: user.email, username: user.username, role: user.role },
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});


// POST /auth/forgot-password
router.post('/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      // We don't want to reveal if a user exists or not
      return res.status(200).json({ message: 'If a user with that email exists, a password reset link has been sent.' });
    }

    // Generate a reset token
    const token = crypto.randomBytes(32).toString('hex');
    const expires = Date.now() + 3600000; // 1 hour

    // Store the token and its expiration
    passwordResetTokens[token] = { userId: user._id, expires };

    // Send the email
    const resetLink = `https://localhost:3000/reset-password?token=${token}`;
    const mailOptions = {
      from: '"Secure Photo App" <noreply@securephoto.com>',
      to: user.email,
      subject: 'Password Reset Request',
      html: `<p>You are receiving this because you (or someone else) have requested the reset of the password for your account.</p>
             <p>Please click on the following link, or paste this into your browser to complete the process:</p>
             <p><a href="${resetLink}">${resetLink}</a></p>
             <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>`
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: 'If a user with that email exists, a password reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'An error occurred while sending the password reset email.' });
  }
});

// POST /auth/reset-password/:token
router.post('/auth/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const tokenData = passwordResetTokens[token];

    if (!tokenData || tokenData.expires < Date.now()) {
      return res.status(400).json({ error: 'Password reset token is invalid or has expired.' });
    }

    const user = await User.findById(tokenData.userId);
    if (!user) {
      return res.status(400).json({ error: 'User not found.' });
    }

    // Set the new password
    user.password = password;
    await user.save();

    // Delete the used token
    delete passwordResetTokens[token];

    res.status(200).json({ message: 'Password has been reset successfully.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'An error occurred while resetting the password.' });
  }
});


module.exports = router;
