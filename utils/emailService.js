const nodemailer = require('nodemailer');

// Nodemailer transporter setup
// Using ethereal.email for testing. In production, use a real SMTP service.
const transporter = nodemailer.createTransport({
  host: 'smtp.ethereal.email',
  port: 587,
  auth: {
    user: 'maddison53@ethereal.email',
    pass: 'jn7jnAPss4f63QBp6D'
  }
});

/**
 * Send a verification code email
 * @param {string} email - Recipient email address
 * @param {string} code - 6-digit verification code
 * @param {string} purpose - Purpose of verification ('password-change' or 'email-change')
 * @returns {Promise<object>} Email send result
 */
const sendVerificationEmail = async (email, code, purpose) => {
  const subjects = {
    'password-change': 'Password Change Verification - Photaro',
    'email-change': 'Email Change Verification - Photaro',
    'email-change-new': 'Confirm Your New Email - Photaro'
  };

  const messages = {
    'password-change': `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #667eea;">Password Change Request</h2>
        <p>You have requested to change your password on Photaro.</p>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #666;">Your verification code is:</p>
          <h1 style="margin: 10px 0; font-size: 36px; color: #667eea; letter-spacing: 5px;">${code}</h1>
          <p style="margin: 0; font-size: 14px; color: #666;">This code will expire in 15 minutes.</p>
        </div>
        <p style="color: #666; font-size: 14px;">If you did not request this change, please ignore this email and ensure your account is secure.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">This is an automated message from Photaro. Please do not reply to this email.</p>
      </div>
    `,
    'email-change': `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #667eea;">Email Change Request</h2>
        <p>You have requested to change your email address on Photaro.</p>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #666;">Your verification code is:</p>
          <h1 style="margin: 10px 0; font-size: 36px; color: #667eea; letter-spacing: 5px;">${code}</h1>
          <p style="margin: 0; font-size: 14px; color: #666;">This code will expire in 15 minutes.</p>
        </div>
        <p style="color: #666; font-size: 14px;">After verifying this code, you'll need to confirm your new email address.</p>
        <p style="color: #666; font-size: 14px;">If you did not request this change, please ignore this email and ensure your account is secure.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">This is an automated message from Photaro. Please do not reply to this email.</p>
      </div>
    `,
    'email-change-new': `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #667eea;">Confirm Your New Email Address</h2>
        <p>This email address has been requested as the new email for a Photaro account.</p>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #666;">Your confirmation code is:</p>
          <h1 style="margin: 10px 0; font-size: 36px; color: #667eea; letter-spacing: 5px;">${code}</h1>
          <p style="margin: 0; font-size: 14px; color: #666;">This code will expire in 15 minutes.</p>
        </div>
        <p style="color: #666; font-size: 14px;">Enter this code to complete the email change process.</p>
        <p style="color: #666; font-size: 14px;">If you did not request this, you can safely ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">This is an automated message from Photaro. Please do not reply to this email.</p>
      </div>
    `
  };

  const mailOptions = {
    from: '"Photaro" <noreply@photaro.com>',
    to: email,
    subject: subjects[purpose] || 'Verification Code - Photaro',
    html: messages[purpose]
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✉️ Email sent:', info.messageId);
    console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));
    return info;
  } catch (error) {
    console.error('❌ Email sending error:', error);
    throw error;
  }
};

module.exports = {
  sendVerificationEmail
};
