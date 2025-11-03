const blacklistedTokens = new Set();

/**
 * Add a token to the blacklist (typically on logout)
 * @param {string} token - JWT token to blacklist
 */
const blacklistToken = (token) => {
  if (token) {
    blacklistedTokens.add(token);
    console.log('✅ Token blacklisted. Total blacklisted tokens:', blacklistedTokens.size);
  }
};

/**
 * Check if a token is blacklisted
 * @param {string} token - JWT token to check
 * @returns {boolean} - true if token is blacklisted, false otherwise
 */
const isTokenBlacklisted = (token) => {
  return blacklistedTokens.has(token);
};

/**
 * Clear expired tokens from blacklist
 * In production with Redis/database, this would use TTL automatically
 * This is just for demonstration
 */
const clearBlacklist = () => {
  blacklistedTokens.clear();
  console.log('Token blacklist cleared');
};

module.exports = {
  blacklistToken,
  isTokenBlacklisted,
  clearBlacklist,
};
