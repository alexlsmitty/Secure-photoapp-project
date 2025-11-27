const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { isTokenBlacklisted } = require('../config/tokenBlacklist');

const authMiddleware = async (req, res, next) => {
  try {
    // Get token from Authorization header (format: "Bearer <token>")
    const token = req.headers.authorization?.split(' ')[1];
    console.log('\n🔐 AuthMiddleware - Validating token');
    console.log('Token received:', token ? `${token.substring(0, 30)}...` : 'NONE');
    
    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({ error: 'No token provided' });
    }

    // Check if token has been blacklisted (logged out)
    const isBlacklisted = isTokenBlacklisted(token);
    console.log('Is blacklisted:', isBlacklisted);
    if (isBlacklisted) {
      console.log('❌ Token is blacklisted');
      return res.status(401).json({ error: 'Session has been invalidated. Please log in again.' });
    }

    // Verify token
    console.log('Verifying JWT...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ JWT verified, user ID:', decoded.id);
    
    req.user = await User.findById(decoded.id);
    
    if (!req.user) {
      console.log('❌ User not found in database');
      return res.status(401).json({ error: 'User not found' });
    }

    console.log('✅ User authenticated:', req.user.username);
    next();
  } catch (error) {
    console.error('❌ AuthMiddleware Error:', error.message);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = authMiddleware;
