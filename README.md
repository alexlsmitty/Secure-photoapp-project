# Secure Photo Sharing App

A secure web application built with Express.js and Vue that implements HTTPS encryption and intelligent caching strategies.

## Phase 1: Secure HTTPS Server with Caching

### Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Generate SSL Certificates**
   ```bash
   openssl req -nodes -new -x509 -keyout server.key -out server.cert
   ```
   - You'll be prompted for information (Country, State, etc.)
   - You can press Enter to skip through these prompts or fill them in
   - This creates a self-signed certificate for local development
   - Skip this step if using the default server setup included within the repo

3. **Start the Server**
   ```bash
   npm start
   ```
   
4. **Access the App**
   - Navigate to `https://localhost:3000`
   - Your browser will show a security warning (expected with self-signed certificates)
   - Click "Advanced" and "Proceed to localhost" to continue

### SSL Configuration

**Method Used:** Self-signed certificate with OpenSSL

**Why this approach?**
Frankly, while I would have liked to use Let's Encrypt I didn't want to bother with setting up a domain in order to use it. Because this project is currently only in local development, I figured I would do this later if required and reevaluate when the time comes. For now, a self-signed certificate with OpenSSL will do just fine. The warning is simply a result of the fact that my self-signed certificate isn't verified by a trusted Certificate Authority, otherwise it does still have an HTTPS connection established and shows that I'm capable of configuring one. 

**Security Headers Implemented:**
- Content Security Policy (CSP): Prevents XSS attacks by controlling resource loading
- X-Frame-Options: Prevents clickjacking by blocking iframe embedding
- HSTS: Forces HTTPS connections for future visits
- Other Helmet defaults: XSS protection, MIME sniffing prevention, etc.

### API Routes and Caching Strategies

#### 1. `GET /photos`
- **Purpose:** Fetch all public photos (main feed)
- **Cache Policy:** `public, max-age=300, stale-while-revalidate=60`
- **Rationale:** Public data that changes somewhat often. 5-minute cache reduces server load while keeping content fresh, stale-while-revalidate ensures smooth UX during updates.

#### 2. `GET /photos/:id`
- **Purpose:** Fetch a single photo by ID
- **Cache Policy:** `public, max-age=600`
- **Rationale:** Individual photos rarely change once posted. 10-minute cache is safe for static content and improves performance.

#### 3. `GET /users/:username`
- **Purpose:** Get user profile and their public photos
- **Cache Policy:** `public, max-age=300`
- **Rationale:** User profiles update occasionally (new posts, bio changes). 5-minute cache balances freshness with performance.

#### 4. `GET /users/:username/private`
- **Purpose:** Access user's private photos
- **Cache Policy:** `private, no-store, no-cache, must-revalidate`
- **Rationale:** Sensitive personal data must never be cached. Each request fetches fresh data to prevent unauthorized access.

#### 5. `POST /photos/upload`
- **Purpose:** Upload a new photo
- **Cache Policy:** `no-store`
- **Rationale:** POST requests should never be cached. Each upload must be processed fresh to prevent duplicate submissions.

### Trade-offs and Considerations

**Performance vs Security:**
- Public content is aggressively cached (5-10 min) for performance
- Private/sensitive data is never cached, prioritizing security
- Stale-while-revalidate provides smooth UX without compromising data freshness

**Cache Duration Decisions:**
- 5 minutes for feeds: Frequent enough to feel current, long enough to reduce load
- 10 minutes for individual items: Static content can be cached longer
- No caching for private data: Security always wins over performance

### Testing the Configuration

**Test HTTPS:**
```bash
curl -k https://localhost:3000
```

**Test Caching Headers:**
```bash
curl -k -I https://localhost:3000/photos
```

*You can test any route you wish by utilizing the above command, which will display the caching headers utilized in each route.*

**Test Routes:**
- Public feed: `https://localhost:3000/photos`
- Single photo: `https://localhost:3000/photos/1`
- User profile: `https://localhost:3000/users/john_doe`
- Private photos: `https://localhost:3000/users/john_doe/private`

### Lessons Learned / Reflection

While the SSL certificate certainly helps the security of my website, I found it to be the easiest part of developing the initial security foundation in comparison to setting up the Helmet security headers. This took a while to do correctly, but is *extremely powerful* as it allows me to whitelist only my website as a source for scripts and other resources. It prevents XSS or cross-site scripting attacks from occuring because of this, and clickjacking attacks are prevented with the X-Frame-Options set to DENY. All future connections are forced to use HTTPS, so even if someone tried to downgrade to unencrypted HTTP it would fail. Altogether, the security headers and SSL certficate help to make my site more secure than previous iterations of websites I've made. Testing it was a bit difficult, as I was unsure how to use bash initially but figured it out quickly once I read some documentation. Overall, this process was not terribly difficult, but definitely required careful attention and thought as to *what* policies were appropriate for each route and ensuring everything lined up with my goals for this initial phase of the project.

I also learned a bit more on how front-end frameworks deal with CSP directives and Helment options. I had to use 

### Technologies Used

- Node.js
- Express.js
- Helmet (security middleware)
- OpenSSL (SSL certificates)
- HTTPS (secure communications)


### Photo Credits:
## Sunset.jpg
- Photo by Sebastian Voortman: https://www.pexels.com/photo/body-of-water-during-golden-hour-189349/

## City.jpg
- Photo by Peng LIU: https://www.pexels.com/photo/raised-building-frame-169647/

## Mountains.jpg
- Photo by Peng LIU: https://www.pexels.com/photo/raised-building-frame-169647/

## Family.jpg
- Photo by Pixabay: https://www.pexels.com/photo/grandmother-and-grandfather-holding-child-on-their-lap-302083/
