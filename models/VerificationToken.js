const mongoose = require('mongoose');
const crypto = require('crypto');

const verificationTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  email: {
    type: String,
    required: true
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['password-change', 'email-change', 'email-change-new'],
    required: true
  },
  // For email change, store the new email
  newEmail: {
    type: String,
    default: null
  },
  expires: {
    type: Date,
    required: true,
    default: () => Date.now() + 15 * 60 * 1000 // 15 minutes
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index to automatically delete expired tokens
verificationTokenSchema.index({ expires: 1 }, { expireAfterSeconds: 0 });

// Static method to generate a verification token
verificationTokenSchema.statics.createToken = async function(userId, email, type, newEmail = null) {
  // Generate a 6-digit code for simplicity and security
  const token = crypto.randomInt(100000, 999999).toString();

  // Delete any existing tokens for this user and type
  await this.deleteMany({ userId, type });

  const verificationToken = await this.create({
    userId,
    email,
    token,
    type,
    newEmail,
    expires: Date.now() + 15 * 60 * 1000 // 15 minutes
  });

  return verificationToken.token;
};

// Static method to verify a token
verificationTokenSchema.statics.verifyToken = async function(userId, token, type) {
  const verificationToken = await this.findOne({
    userId,
    token,
    type,
    expires: { $gt: Date.now() }
  });

  if (!verificationToken) {
    return null;
  }

  return verificationToken;
};

// Static method to consume (delete) a token after use
verificationTokenSchema.statics.consumeToken = async function(userId, token, type) {
  const result = await this.deleteOne({ userId, token, type });
  return result.deletedCount > 0;
};

module.exports = mongoose.model('VerificationToken', verificationTokenSchema);
