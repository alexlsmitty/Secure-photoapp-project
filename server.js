const https = require('https');
const fs = require('fs');
const express = require('express');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();
const connectDB = require('./config/database');
const cookieParser = require('cookie-parser');
const { parseFormData } = require('./middleware/csrfMiddleware');

// Connect to MongoDB
connectDB();

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(parseFormData);
app.use(express.static('public'));
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  xFrameOptions: { action: 'deny' },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
}));

// Import routes (AFTER middleware)
const authRoutes = require('./routes/auth');
const photoRoutes = require('./routes/photos');
const profileRoutes = require('./routes/profile');
const adminRoutes = require('./routes/admin');

app.use('/', authRoutes);
app.use('/', photoRoutes);
app.use('/profile', profileRoutes);
app.use('/', adminRoutes);

// Basic health check route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Secure Photo Sharing App API',
    status: 'running',
    https: true 
  });
});

// Error catching for SSL certs, running the HTTPS server 
try {
  const options = {
    key: fs.readFileSync(path.join(__dirname, 'server.key')),
    cert: fs.readFileSync(path.join(__dirname, 'server.cert'))
  };

  https.createServer(options, app).listen(PORT, () => {
    console.log(`Secure server running on https://localhost:${PORT}`);
    console.log(`Photo sharing app is ready!`);
  });
} catch (error) {
  console.error('❌ Error starting HTTPS server:');
  console.error('Make sure you have generated SSL certificates using the following command or redownload the repo:');
  console.error('openssl req -nodes -new -x509 -keyout server.key -out server.cert');
  console.error('\nError details:', error.message);
  process.exit(1);
}
