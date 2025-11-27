const express = require('express');
const Photo = require('../models/Photo');
const authMiddleware = require('../middleware/authMiddleware');
const { privacyToggleLimiter } = require('../middleware/profileRateLimiters');
const router = express.Router();

// GET /photos - All public photos (feed)
// Cache: public, 5 minutes with stale-while-revalidate
router.get('/photos', async (req, res) => {
  try {
    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
    
    const photos = await Photo.find({ public: true });
    res.json({
      photos,
      count: photos.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /photos/:id - Single photo details (PUBLIC ONLY)
// Cache: public, 10 minutes (individual photos rarely change)
router.get('/photos/:id', async (req, res) => {
  try {
    res.set('Cache-Control', 'public, max-age=600');
    
    const photo = await Photo.findById(req.params.id);
    
    if (!photo || !photo.public) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    
    res.json(photo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /photos/:id/detail - Single photo details (PRIVATE OR PUBLIC)
// Requires authentication - checks ownership or admin status
// Cache: private, no-store (sensitive personal data)
router.get('/photos/:id/detail', authMiddleware, async (req, res) => {
  try {
    res.set('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    
    const photo = await Photo.findById(req.params.id);
    
    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    
    // If photo is public, anyone can view it
    if (photo.public) {
      res.set('Cache-Control', 'public, max-age=600');
      return res.json(photo);
    }
    
    // If photo is private, only owner or admin can view it
    if (photo.userId.toString() !== req.user.userId.toString() && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Access denied. You can only view your own private photos.' });
    }
    
    res.json(photo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /my-photos - Get all photos for current user (public + private)
// Cache: private, no-store (user's personal photos)
// Requires authentication
router.get('/my-photos', authMiddleware, async (req, res) => {
  try {
    res.set('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    
    const photos = await Photo.find({ userId: req.user.userId });
    
    const publicPhotos = photos.filter(p => p.public);
    const privatePhotos = photos.filter(p => !p.public);
    
    res.json({
      photos,
      publicCount: publicPhotos.length,
      privateCount: privatePhotos.length,
      totalCount: photos.length
    });
  } catch (error) {
    console.error('Fetch my photos error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /photos/:id/privacy - Toggle photo privacy (public/private)
// Cache: no-store (never cache PUT requests)
// Requires authentication and rate limiting
router.put('/photos/:id/privacy', authMiddleware, privacyToggleLimiter, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    
    const { public: isPublic } = req.body;
    
    if (typeof isPublic !== 'boolean') {
      return res.status(400).json({ error: 'Invalid privacy setting. Must be true or false.' });
    }
    
    const photo = await Photo.findById(req.params.id);
    
    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    
    // Only owner can change privacy settings
    if (photo.userId.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ error: 'Access denied. You can only modify your own photos.' });
    }
    
    photo.public = isPublic;
    await photo.save();
    
    res.json({
      message: `Photo is now ${isPublic ? 'public' : 'private'}`,
      photo
    });
  } catch (error) {
    console.error('Privacy toggle error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /users/:username - User's profile and public photos
// Cache: public, 5 minutes (profiles update occasionally)
router.get('/users/:username', async (req, res) => {
  try {
    res.set('Cache-Control', 'public, max-age=300');
    
    const photos = await Photo.find({ username: req.params.username, public: true });
    res.json({
      user: { username: req.params.username },
      photos,
      photoCount: photos.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /users/:username/private - User's private photos
// Cache: private, no-store (sensitive personal data)
// Requires authentication - only user can see their own private photos
router.get('/users/:username/private', authMiddleware, async (req, res) => {
  try {
    res.set('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    
    // Only let users view their own private photos
    if (req.user.username !== req.params.username) {
      return res.status(403).json({ error: 'Access denied. You can only view your own private photos.' });
    }
    
    const photos = await Photo.find({ username: req.params.username, public: false });
    res.json({
      photos,
      cachePolicy: 'No caching - sensitive data'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /photos/upload - Upload new photo
// Cache: no-store (never cache POST requests)
// Requires authentication
router.post('/photos/upload', authMiddleware, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    
    const { title, url, public: isPublic } = req.body;
    
    if (!title || !url) {
      return res.status(400).json({ error: 'Missing required fields: title, url' });
    }
    
    const photo = new Photo({
      title,
      url,
      username: req.user.username,
      userId: req.user.userId,
      public: isPublic !== false
    });
    
    await photo.save();
    
    res.status(201).json({
      message: 'Photo uploaded successfully',
      photo
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
