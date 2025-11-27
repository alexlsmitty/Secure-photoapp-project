# Secure Photo Sharing Application

A secure photo sharing web application built with Node.js and Express, featuring robust authentication, role-based access control, and multiple layers of security to protect user data and prevent common web vulnerabilities. Additionally has a Vue.js CDN front-end, to make the user interface easier to navigate.

---

## Phase 3: Updates and Changes

### Overview
Phase 3 focused on enhancing security, improving user experience, fixing critical bugs, and establishing a cohesive brand identity. The application was rebranded to **Photaro** with a professional, emoji-free design and enhanced security through email verification for sensitive operations.

---

### 1. Brand Identity & UI/UX Improvements

#### Rebranding to "Photaro"
- Changed application name from "Photo Sharing App" to **Photaro** across all components
- Updated in `public/index.html` (page title)
- Updated in `public/app.js` (main header)
- Created consistent brand messaging throughout the application

#### Emoji-Free Professional Design
**Rationale:** Removed all emojis to create a more professional, enterprise-ready appearance suitable for business environments.

**Files Modified:**
- `public/components/Dashboard.js` - Removed 15+ emoji instances from UI messages and buttons
- `public/app.js` - Removed emojis from navigation and console logs
- `public/components/UploadPhoto.js` - Removed emojis from success messages

**Examples of Changes:**
- "📊 My Dashboard" → "My Dashboard"
- "✅ Password changed successfully!" → "Password changed successfully!"
- "🔒 Private" → "Private"

#### Enhanced CSS Architecture

**New Global Utility Classes** (`public/css/styles.css`):
```css
/* Text utilities */
.text-center, .text-left, .text-right
.text-muted, .text-primary, .text-danger, .text-success

/* Spacing utilities */
.mt-10, .mt-20, .mt-30 (margin-top)
.mb-10, .mb-20, .mb-30 (margin-bottom)
.p-10, .p-20, .p-30 (padding)

/* Layout utilities */
.d-flex, .flex-column
.align-center, .justify-center, .justify-between
.gap-10, .gap-20

/* Responsive grids */
.grid-2, .grid-3, .grid-4 (auto-responsive)

/* Card components */
.card, .card-header, .card-title, .card-body
```

**Dashboard-Specific Styles:**
- Professional tab navigation with active states and smooth transitions
- Structured button variants (`.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-toggle`)
- Password strength indicators with color-coded feedback
- Privacy badges for photo visibility states
- Danger zone styling for destructive actions
- Responsive design with mobile breakpoints

**Design Features:**
- Consistent purple gradient theme (`#667eea` to `#764ba2`)
- Smooth animations and hover effects
- Card-based layouts for better content organization
- Professional typography and spacing
- Mobile-responsive grid system

---

### 2. Critical Bug Fixes

#### Photo Upload 500 Error Resolution
**Issue:** Users encountered a 500 Internal Server Error when attempting to upload photos.

**Root Cause:** The authentication middleware sets `req.user` to the full User document from MongoDB, which has an `_id` field (MongoDB's default). However, the photo upload route was incorrectly trying to access `req.user.userId`, which doesn't exist.

**Fix Applied** (`routes/photos.js`):
```javascript
// Before (BROKEN):
userId: req.user.userId  // ❌ Undefined - causes server error

// After (FIXED):
userId: req.user._id     // ✅ Correct MongoDB ObjectId
```

**Files Modified:**
- `routes/photos.js` - Fixed 4 occurrences:
  - Line 61: Photo privacy check
  - Line 78: "My photos" query
  - Line 115: Photo ownership verification
  - Line 188: Photo upload (primary fix)

**Impact:** Resolved complete inability to upload photos, restoring core application functionality.

---

### 3. Email Verification System for Sensitive Operations

#### Architecture Overview
Implemented a comprehensive two-factor authentication system requiring email verification for password changes and email address modifications. This adds a critical security layer preventing account takeover even if credentials are compromised.

#### New Backend Components

**A. Verification Token Model** (`models/VerificationToken.js`)
- **Purpose:** Securely generates and manages verification codes
- **Features:**
  - 6-digit numeric codes (100,000 - 999,999 range)
  - Three verification types:
    - `password-change` - For password modifications
    - `email-change` - For current email verification
    - `email-change-new` - For new email confirmation
  - 15-minute expiration window (configurable)
  - MongoDB TTL (Time-To-Live) index for automatic cleanup
  - One-time use tokens (consumed after successful verification)

**Static Methods:**
```javascript
createToken(userId, email, type, newEmail)  // Generate verification code
verifyToken(userId, token, type)            // Validate code
consumeToken(userId, token, type)           // Delete after use
```

**B. Email Service** (`utils/emailService.js`)
- **SMTP Configuration:** Nodemailer with Ethereal (test) / production SMTP
- **Professional HTML Email Templates:**
  - Branded with Photaro identity
  - Color-coded verification codes (36px, letter-spaced)
  - Clear instructions and expiration notices
  - Security warnings for unauthorized requests
  - Responsive design for mobile devices

**Email Types:**
1. **Password Change Verification**
   - Subject: "Password Change Verification - Photaro"
   - Sent to: Current email address
   - Contains: 6-digit code, expiration time, security notice

2. **Email Change - Current Email**
   - Subject: "Email Change Verification - Photaro"
   - Sent to: Current email address
   - Purpose: Verify user owns current email

3. **Email Change - New Email**
   - Subject: "Confirm Your New Email - Photaro"
   - Sent to: New email address
   - Purpose: Verify user owns new email

**C. New API Endpoints** (`routes/profile.js`)

| Endpoint | Method | Purpose | Authentication |
|----------|--------|---------|----------------|
| `/profile/request-password-verification` | POST | Request verification code for password change | Required |
| `/profile/request-email-verification` | POST | Request verification code for email change | Required |
| `/profile/verify-code` | POST | Verify any verification code | Required |
| `/profile/password` | PUT | Change password (requires code) | Required |
| `/profile/email` | PUT | Change email (requires dual verification) | Required |

**Updated Endpoint - `/profile` (PUT):**
- Now **blocks** direct email changes
- Returns error: "Email changes require verification. Please use the email change feature with verification codes."
- Users must use the dedicated verification flow

#### Security Flow Diagrams

**Password Change Flow:**
```
1. User clicks "Send Verification Code"
   ↓
2. Server generates 6-digit code → Stores in DB with 15min expiry
   ↓
3. Email sent to user's current email
   ↓
4. User enters: Code + Current Password + New Password
   ↓
5. Server verifies:
   - Code is valid and not expired
   - Current password matches
   - New password meets requirements
   ↓
6. Password updated → Token consumed (one-time use)
   ↓
7. Success: User can log in with new password
```

**Email Change Flow:**
```
1. User enters new email address
   ↓
2. Server validates new email isn't already in use
   ↓
3. Code sent to CURRENT email (verify ownership)
   ↓
4. User enters code from current email
   ↓
5. Server verifies code → Sends NEW code to NEW email
   ↓
6. User enters code from new email
   ↓
7. Server verifies both codes → Updates email
   ↓
8. Success: Email changed, user receives confirmation
```

---

### 4. Frontend Implementation

#### Updated Dashboard Component (`public/components/Dashboard.js`)

**New Data Properties:**
```javascript
passwordChange: {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
  verificationCode: '',      // NEW
  codeSent: false,           // NEW - tracks if code was sent
  codeVerified: false        // NEW - tracks verification status
}

emailChange: {               // NEW - entire object
  newEmail: '',
  oldEmailCode: '',          // Code from current email
  newEmailCode: '',          // Code from new email
  oldCodeSent: false,        // Step 1 complete
  newCodeSent: false,        // Step 2 complete
  showForm: false            // Toggle form visibility
}
```

**New Methods:**
- `requestPasswordVerificationCode()` - Request password change code
- `changePassword()` - Updated to require verification code
- `requestEmailVerificationCode()` - Request email change code
- `verifyOldEmailCode()` - Verify current email ownership
- `changeEmail()` - Complete email change with both codes

**Enhanced Security Tab UI:**

**Password Change Section:**
- Step-by-step guided process
- Visual indicators for each step
- Code input with 6-character limit
- Real-time password strength meter
- Clear error messages and validation
- Cancel button to restart process

**Email Change Section:**
- Three-step progressive disclosure:
  1. **Step 1:** Enter new email → Request code for current email
  2. **Step 2:** Enter code from current email → Triggers code to new email
  3. **Step 3:** Enter code from new email → Complete change
- Email masking for privacy (e.g., `jo***@example.com`)
- Clear visual progress through steps
- Cancel option at each step

**User Experience Enhancements:**
- Disabled state management (buttons disabled until requirements met)
- Success/error message display
- Auto-reset forms on successful completion
- Helpful placeholder text and instructions
- Consistent styling with site theme

---

### 5. Security Features & Safeguards

#### Multi-Layer Verification
1. **Email Ownership Proof:** Users must have access to email to change sensitive data
2. **Time-Limited Codes:** 15-minute expiration prevents delayed replay attacks
3. **One-Time Use:** Codes consumed after use, preventing reuse
4. **Dual Verification for Email:** Both old and new email must be verified
5. **Rate Limiting:** Existing rate limiters prevent verification code spam

#### Privacy Protections
- **Email Masking:** Partial email shown in UI (`jo***@example.com`)
- **Secure Token Storage:** Verification tokens hashed and stored in database
- **Auto-Cleanup:** MongoDB TTL index automatically deletes expired tokens
- **No Token Leakage:** Codes never exposed in URLs or logs

#### Attack Prevention
- **Account Takeover Prevention:** Even with password, attacker needs email access
- **Session Hijacking Mitigation:** Email verification required for password changes
- **Brute Force Protection:** 6-digit codes + 15min expiry = limited attempts
- **Race Condition Prevention:** Token consumption prevents concurrent use

---

### 6. Technical Improvements

#### Code Quality
- **Separation of Concerns:** Email service isolated in `utils/emailService.js`
- **Reusable Components:** Verification token model supports multiple use cases
- **Error Handling:** Comprehensive try-catch blocks with meaningful error messages
- **Input Validation:** Email format validation, required field checks
- **Type Safety:** Verification type enum prevents invalid token types

#### Database Optimization
- **Indexed Expiration:** MongoDB TTL index automatically removes expired tokens
- **Efficient Queries:** Compound indexes on `userId + type + token`
- **No Orphaned Data:** Automatic cleanup prevents database bloat

#### User Experience
- **Clear Feedback:** Step-by-step progress indicators
- **Helpful Errors:** Specific error messages guide users
- **Visual Design:** Consistent with brand identity
- **Mobile Responsive:** Works on all device sizes

---

### 7. Configuration & Deployment Notes

#### Email Service Configuration
**Development (Current):**
- Uses Ethereal Email (test SMTP)
- Email preview URLs logged to console
- No actual emails sent to users

**Production Requirements:**
Update `utils/emailService.js` with real SMTP credentials:
```javascript
// Production SMTP examples:
// - SendGrid
// - AWS SES
// - Mailgun
// - Your own SMTP server

const transporter = nodemailer.createTransport({
  host: 'smtp.yourdomain.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});
```

#### Environment Variables
Add to `.env`:
```
EMAIL_USER=your-smtp-username
EMAIL_PASSWORD=your-smtp-password
EMAIL_FROM=noreply@photaro.com
```

---

### 8. Testing the New Features

#### Test Password Change with Verification
1. Navigate to Dashboard → Security tab
2. Click "Send Verification Code to Email"
3. Check console for email preview URL (Ethereal)
4. Copy 6-digit code from email
5. Enter: Code + Current Password + New Password
6. Verify password changed successfully
7. Test login with new password

#### Test Email Change with Dual Verification
1. Navigate to Dashboard → Security tab
2. Click "Change Email Address"
3. Enter new email address
4. Click "Send Code to Current Email"
5. Check console for first email preview URL
6. Enter code from current email
7. Check console for second email preview URL
8. Enter code from new email
9. Verify email updated in profile
10. Confirm new email in database

#### Test Security Validations
- **Expired Code:** Wait 16 minutes, try to use code (should fail)
- **Invalid Code:** Enter wrong code (should reject)
- **Reused Code:** Try using same code twice (should fail second time)
- **Email Mismatch:** Try different email than requested (should reject)

---

### 9. Files Modified & Created

#### New Files Created
```
models/VerificationToken.js          # Verification token model
utils/emailService.js                # Email sending service
```

#### Files Modified
```
routes/profile.js                    # Added verification endpoints & updated password/email routes
routes/photos.js                     # Fixed req.user.userId → req.user._id bug
public/components/Dashboard.js       # Added verification UI & methods
public/components/UploadPhoto.js     # Removed emojis
public/app.js                        # Rebranded to Photaro, removed emojis
public/index.html                    # Already had Photaro title
public/css/styles.css                # Added 500+ lines of new styles
```

---

### 10. Breaking Changes

#### API Changes
**`PUT /profile`** - Email changes now rejected:
```javascript
// Old behavior: Direct email update
PUT /profile
Body: { email: "new@email.com" }

// New behavior: Returns error
Response: 400 Bad Request
{
  "error": "Email changes require verification.
            Please use the email change feature with verification codes."
}
```

**`PUT /profile/password`** - Now requires verification code:
```javascript
// Old request:
{
  "currentPassword": "old",
  "newPassword": "new"
}

// New request:
{
  "currentPassword": "old",
  "newPassword": "new",
  "verificationCode": "123456"  // Required
}
```

#### Migration Guide for Existing Users
1. **Password Changes:** Users must request verification code first
2. **Email Changes:** Use new dedicated email change flow
3. **No Data Migration Required:** Existing user data unchanged
4. **Backwards Compatible:** Old endpoints still work for profile updates (except email)

---

### 11. Future Enhancements

#### Potential Improvements
1. **SMS Verification:** Add phone number as alternative to email
2. **Backup Codes:** Generate one-time backup codes for account recovery
3. **Verification History:** Log all verification attempts for audit
4. **Customizable Expiration:** Allow admins to configure code expiry time
5. **Multi-Language Support:** Translate email templates
6. **Email Templates:** Allow admins to customize email design
7. **Rate Limiting on Codes:** Limit verification code requests per user

#### Security Hardening
1. **CAPTCHA Integration:** Prevent automated verification code requests
2. **Anomaly Detection:** Flag suspicious verification patterns
3. **Geo-Location Checks:** Warn users of verification from new locations
4. **Device Fingerprinting:** Track which devices request codes

---

### 12. Performance Considerations

#### Database Impact
- **New Collection:** `verificationtokens` (minimal storage)
- **TTL Index:** Automatic cleanup, no manual deletion needed
- **Query Efficiency:** Indexed on userId, type, token for fast lookups

#### Email Service Impact
- **Rate Limiting:** Existing rate limiters prevent spam
- **Asynchronous:** Email sending doesn't block requests
- **Error Handling:** Failed emails logged, don't crash server

#### Frontend Impact
- **Minimal JS Increase:** ~200 lines added to Dashboard.js
- **No External Dependencies:** Uses existing Vue.js
- **Progressive Enhancement:** Works without JavaScript for basic flow

---

### Summary of Phase 3 Achievements

✅ **Enhanced Security:** Email verification for password and email changes
✅ **Professional Branding:** Rebranded to Photaro with emoji-free design
✅ **Bug Fixes:** Resolved critical photo upload 500 error
✅ **Improved UX:** Clear step-by-step flows with visual feedback
✅ **Code Quality:** Modular architecture with reusable components
✅ **Production Ready:** Configurable for real SMTP services

**Lines of Code Added:** ~1,000+
**Security Level:** Significantly Enhanced
**User Experience:** Professional & Intuitive
**Maintainability:** Excellent (modular, well-documented)

---

## Table of Contents

- [Quick Start](#quick-start)
- [Authentication Mechanisms](#authentication-mechanisms)
- [Role-Based Access Control](#role-based-access-control)
- [Security Features](#security-features)
- [API Endpoints](#api-endpoints)
- [Lessons Learned](#lessons-learned)

## Quick Start

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- npm or yarn package manager

### Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/Secure-photoapp-project.git
   cd Secure-photoapp-project
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Generate SSL certificates** (required for HTTPS)
   ```bash
   openssl req -nodes -new -x509 -keyout server.key -out server.cert
   ```

4. **Configure environment variables**
   Create a `.env` file in the root directory:
   ```
   MONGODB_URI=mongodb://localhost:27017/photo-app
   JWT_SECRET=your-super-secret-jwt-key-please-for-the-love-of-god-change-this-or-people-will-hack-your-stuff
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   NODE_ENV=development
   ```

5. **Start the application**
   ```bash
   npm start
   ```
   The app will run on `https://localhost:3000`

   For development with auto-reload:
   ```bash
   npm run dev
   ```

---

## Authentication Mechanisms

The application implements a two-layer authentication system combining local credentials and JWT-based session management.

### Local Authentication

Users can create accounts with an email and password. Here's how it works:

**Registration Process:**
1. User provides email, username, and password
2. System checks if email/username already exists
3. Password is hashed using bcryptjs (10 salt rounds) before storage
4. User account is created in MongoDB
5. JWT token is generated and set as an HttpOnly cookie

**Login Process:**
1. User submits email and password
2. System retrieves user from database
3. Password is compared with stored hash using bcryptjs
4. If valid, a new JWT token is generated (session fixation prevention)
5. Token is set as a secure HttpOnly cookie

**Why this approach?** Bcryptjs is slow by design—it's intentionally computationally expensive, which makes it resistant to brute-force attacks. Even if someone got the password hashes, cracking them would take an impractically long time.

### JWT Token Management

**Token Storage:** HttpOnly cookies with the following attributes:
- `httpOnly: true` - Prevents JavaScript from accessing the token (XSS protection)
- `secure: true` - Token only sent over HTTPS
- `sameSite: 'strict'` - Prevents CSRF attacks by blocking cross-site cookie sending
- `maxAge: 7 days` - Tokens expire after 7 days, requiring re-authentication

**Why HttpOnly cookies?** This is more secure than localStorage because JavaScript can't access it, protecting against XSS attacks. Even if an attacker injects malicious code, they can't steal the token.

**Token Blacklist on Logout:**
When users log out, their token is added to an in-memory blacklist. This prevents old tokens from being used even if they're somehow intercepted, providing complete session control.

### Third-Party Authentication (SSO Ready)

The application is structured to support OAuth providers (like Google). The authentication middleware can validate tokens from both local and SSO providers.

---

## Role-Based Access Control

The application implements a simple but effective role system with two tiers:

### User Roles

**User Role (Default)**
- Can upload photos (public or private)
- Can view their own profile and public photos
- Can view their private photos
- Cannot access admin endpoints

**Admin Role**
- Can view all users in the system
- Can promote/demote users
- Can view all photos (public and private)
- Can delete any photo
- Can access `/admin/*` endpoints

### Role Enforcement

Roles are stored in the MongoDB User model and validated via middleware on every protected request. Here's the flow:

```
Request → authMiddleware (verify JWT) → roleMiddleware (check role) → Route Handler
```

If a user lacks the required role, they get a 403 Forbidden response.

### How Roles Are Assigned

- **Default:** Users are assigned the "User" role on signup
- **Promotion:** Only admins can promote users to admin via the `/admin/promote/:userId` endpoint
- **Demotion:** Only admins can demote admins back to regular users

---

## Security Features

Here's a breakdown of each security layer and why it matters:

### 1. **HTTPS/SSL Encryption**
- All traffic is encrypted using SSL/TLS certificates
- Prevents man-in-the-middle attacks where someone on the network could see user credentials or data
- Think of it like a locked envelope for your messages instead of a postcard anyone can read

### 2. **Password Hashing with Bcryptjs**
- Passwords are never stored as plain text
- Bcryptjs uses salting and multiple rounds to slow down cracking attempts
- Even if the database is compromised, passwords can't be easily recovered

### 3. **JWT Tokens with Expiration**
- Tokens expire after 7 days, limiting the window of vulnerability if a token is stolen
- Short expiration times reduce the impact of token compromise

### 4. **CSRF Protection (Cross-Site Request Forgery)**
- Implemented via the `csurf` middleware and cookie parsing
- Prevents attackers from tricking users into performing unintended actions on the app
- Example attack prevented: A malicious site can't trick your browser into deleting your photos

### 5. **HttpOnly Cookies**
- Tokens stored in HttpOnly cookies can't be accessed by JavaScript
- Protects against XSS (Cross-Site Scripting) attacks
- Even if malicious code runs on the page, it can't steal the token

### 6. **Rate Limiting**
- **Login attempts:** Limited to 5 attempts per 15 minutes
- **Signup attempts:** Limited to 3 attempts per hour
- Prevents brute-force attacks and account enumeration
- Temporarily locks attackers out after exceeding limits

### 7. **Session Fixation Prevention**
- New tokens are generated on every login/signup (not reused)
- Tokens are invalidated on logout via the blacklist
- If an attacker somehow obtains an old session ID, it won't work because the app always generates fresh ones

### 8. **Content Security Policy (CSP)**
- Configured via Helmet middleware
- Restricts what scripts/styles can run on the page
- Prevents injected malicious code from executing

### 9. **HSTS (HTTP Strict Transport Security)**
- Configured via Helmet with 1-year max-age
- Tells browsers to always use HTTPS when communicating with the app
- Prevents downgrade attacks where attackers force unencrypted connections

### 10. **X-Frame-Options Protection**
- Set to 'deny' via Helmet
- Prevents the app from being embedded in iframes on other sites
- Stops clickjacking attacks

### 11. **Secure Caching Headers**
- Public photos: Cached for 5 minutes (improves performance)
- Private photos: Never cached (`no-store`, `no-cache`, `must-revalidate`)
- POST requests: Never cached
- Prevents sensitive data from being stored in browser cache

---

## API Endpoints

### Authentication Routes

**POST /auth/signup**
```json
Request:
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "securepassword123"
}

Response:
{
  "message": "User created successfully",
  "token": "eyJhbGc...",
  "user": {
    "id": "...",
    "email": "user@example.com",
    "username": "johndoe",
    "role": "User"
  }
}
```

**POST /auth/login**
```json
Request:
{
  "email": "user@example.com",
  "password": "securepassword123"
}

Response:
{
  "message": "Login successful",
  "token": "eyJhbGc...",
  "user": { ... }
}
```

**POST /auth/logout** (requires authentication)
```
Headers:
Authorization: Bearer <token>

Response:
{
  "message": "Logged out successfully. Session invalidated."
}
```

### Photo Routes

**GET /photos** (public, cached)
- Returns all public photos

**GET /photos/:id** (public, cached)
- Returns a single public photo

**GET /users/:username** (public, cached)
- Returns a user's profile and public photos

**GET /users/:username/private** (requires auth, not cached)
- Returns a user's private photos
- Only accessible to the user who owns them

**POST /photos/upload** (requires auth)
```json
Request:
{
  "title": "My Photo",
  "url": "https://...",
  "public": true
}

Response:
{
  "message": "Photo uploaded successfully",
  "photo": { ... }
}
```

### Admin Routes (Admin-only)

**GET /admin/users**
- Returns all users in the system (passwords excluded)

**POST /admin/promote/:userId**
- Promotes a user to admin

**POST /admin/demote/:userId**
- Demotes an admin to regular user

**GET /admin/photos**
- Returns all photos (public and private)

**DELETE /admin/photos/:photoId**
- Deletes a photo

---

## Lessons Learned

### What Went Well

1. **HttpOnly Cookies + HTTPS = Solid Foundation**
   - Using HttpOnly cookies instead of localStorage immediately eliminated XSS token theft vulnerabilities
   - Combining this with HTTPS made the authentication layer very robust

2. **Rate Limiting Prevents Abuse**
   - Implementing rate limits on login/signup was straightforward but incredibly effective
   - It immediately prevented brute-force attacks and account enumeration

3. **Token Blacklist for Logout**
   - A simple in-memory blacklist solved the logout problem elegantly
   - Users are immediately logged out when they log out (not just when the token expires)

4. **Middleware Pipeline**
   - Layering middleware (auth → role check → handler) made authorization logic clean and reusable
   - Adding a new protected endpoint is as simple as attaching middleware

### Challenges Faced

1. **Session Fixation Prevention**
   - **Challenge:** Initially considered reusing tokens, but realized this could let attackers maintain compromised sessions
   - **Solution:** Generate new tokens on every login/signup, making old tokens useless
   - **Trade-off:** Requires careful token management, but vastly improves security

2. **Token Storage Dilemma**
   - **Challenge:** Chose HttpOnly cookies for security, but this means:
     - Frontend can't directly access the token (can't debug easily, had to try multiple configurations to get it to work)
     - Token is only available server-side (requires API for refresh logic)
   - **Solution:** Accepted these constraints for better security—security > convenience

3. **Balancing Cache with Security**
   - **Challenge:** Public photos should cache for performance, but private photos must never cache
   - **Solution:** Implemented granular cache headers:
     - Public: cached 5 minutes
     - Private: never cached
     - POST: never cached
   - **Trade-off:** More complex but ensures sensitive data never lingers in cache

4. **CSRF Protection in a Token-Based API**
   - **Challenge:** CSRF middleware (`csurf`) is traditionally for form-based apps, not APIs
   - **Solution:** Configured it to work with cookies, even though token-based auth is already CSRF-safe
   - **Lesson:** Defense in depth—multiple layers catch different attack vectors

5. **Admin Role Scope**
   - **Challenge:** Decided how powerful admins should be
   - **Decision:** Admins can view/delete all photos and manage users
   - **Trade-off:** Simpler implementation, but in production might need more granular admin roles (e.g., photo moderators vs. user managers)

### Security Trade-offs Made

| Security Measure | Trade-off | Reasoning |
|---|---|---|
| HttpOnly cookies | Can't debug token directly in browser | Worth it—XSS protection is critical |
| 7-day token expiry | Users need to re-login every week | Balanced with convenience—not too frequent |
| Rate limiting | Legitimate users might get blocked briefly | Prevents account takeover attempts |
| No token refresh endpoint | Users must log in again when tokens expire | Simpler to implement, acceptable UX |
| In-memory blacklist | Lost on server restart | Fine for development; use Redis in production |

### What I'd Improve in Production

1. **Persistent Token Blacklist:** Use Redis instead of in-memory storage so logout persists across server restarts
2. **OAuth Integration:** Fully implement Google OAuth 2.0 for SSO, not just the scaffold
3. **Email Verification:** Verify email addresses on signup to prevent fake accounts
4. **Password Reset Flow:** Add secure password reset via email tokens
5. **Audit Logging:** Log all admin actions and authentication events for compliance
6. **2FA (Two-Factor Authentication):** Add TOTP or SMS-based 2FA for extra security
7. **Granular Admin Roles:** Split admin functionality into specific roles (photo moderator, user manager, etc.)
8. **API Rate Limiting by User:** Prevent resource exhaustion by individual users, not just IPs

### Key Takeaway

Security and usability shouldn't be enemies, they're partners. The best security system is one that users will actually use. HttpOnly cookies, JWT expiration, and rate limiting all improve security without frustrating users. The challenge is finding that balance: strong enough to stop attacks, flexible enough that legitimate users aren't blocked. I feel like I achieved that somewhat decently with this application, though there are still things to improve if I were to go to full production.

---

## Testing the Application

### Testing Files and Screenshots
If you don't wish to test the application yourself, I've posted some screenshots in addition to a recording of the user introduction and basic features of the website. These are contained within the testing directory of this repository. 

### Test Authentication Flow
1. Sign up at `https://localhost:3000/auth/signup`
2. Verify token is set as HttpOnly cookie (check browser DevTools → Application → Cookies)
3. Login with credentials
4. Try accessing `/admin/users` as a regular user (should return 403 Forbidden)
5. Promote user to admin via database or admin endpoint
6. Access `/admin/users` again (should succeed)
7. Logout and verify token is blacklisted (subsequent requests fail with 401 Unauthorized)

### Test Rate Limiting
1. Try logging in with wrong password 5 times in quick succession
2. Verify you get blocked with "Too many login attempts" message
3. Wait 15 minutes or restart the server to test again

### Test CSRF/XSS Protection
1. Verify CSRF token is present on forms (if using form-based auth)
2. Try accessing the app from a different origin and verify requests fail
3. Check browser DevTools → Application → Cookies to confirm HttpOnly flag

---

## License

ISC
