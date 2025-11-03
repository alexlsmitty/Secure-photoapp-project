# Secure Photo Sharing Application

A secure photo sharing web application built with Node.js and Express, featuring robust authentication, role-based access control, and multiple layers of security to protect user data and prevent common web vulnerabilities. Additionally has a Vue.js CDN front-end, to make the user interface easier to navigate. 

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
