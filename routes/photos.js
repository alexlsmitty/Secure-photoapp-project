const express = require('express');
const router = express.Router();

// Mock data for demonstration
const photos = [
  { id: 1, title: 'Sunset Beach', url: '/images/sunset.jpg', username: 'john_doe', public: true },
  { id: 2, title: 'Mountain View', url: '/images/mountain.jpg', username: 'jane_smith', public: true },
  { id: 3, title: 'City Lights', url: '/images/city.jpg', username: 'john_doe', public: true },
  { id: 4, title: 'Private Family Photo', url: '/images/family.jpg', username: 'john_doe', public: false },
];

const users = [
  { username: 'john_doe', name: 'John Doe', bio: 'Photography enthusiast' },
  { username: 'jane_smith', name: 'Jane Smith', bio: 'Nature lover' },
];

// Route 1: GET /photos - All public photos (feed)
// Cache: public, 5 minutes with stale-while-revalidate
router.get('/photos', (req, res) => {
  res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
  
  const publicPhotos = photos.filter(photo => photo.public);
  res.json({
    photos: publicPhotos,
    count: publicPhotos.length
  });
});

// Route 2: GET /photos/:id - Single photo details
// Cache: public, 10 minutes (individual photos rarely change)
router.get('/photos/:id', (req, res) => {
  res.set('Cache-Control', 'public, max-age=600');
  
  const photoId = parseInt(req.params.id);
  const photo = photos.find(p => p.id === photoId && p.public);
  
  if (!photo) {
    return res.status(404).json({ error: 'Photo not found' });
  }
  
  res.json(photo);
});

// Route 3: GET /users/:username - User's profile and public photos
// Cache: public, 5 minutes (profiles update occasionally)
router.get('/users/:username', (req, res) => {
  res.set('Cache-Control', 'public, max-age=300');
  
  const { username } = req.params;
  const user = users.find(u => u.username === username);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const userPhotos = photos.filter(p => p.username === username && p.public);
  
  res.json({
    user,
    photos: userPhotos,
    photoCount: userPhotos.length
  });
});

// Route 4: GET /users/:username/private - User's private photos
// Cache: private, no-store (sensitive personal data)
router.get('/users/:username/private', (req, res) => {
  res.set('Cache-Control', 'private, no-store, no-cache, must-revalidate');
  
  const { username } = req.params;
  
  // In later iterations this should be changed to an actual authentication mechanism
  //
  
  const userPrivatePhotos = photos.filter(p => p.username === username && !p.public);
  
  res.json({
    photos: userPrivatePhotos,
    securityNote: 'This endpoint requires authentication in production',
    cachePolicy: 'No caching - sensitive data'
  });
});

// Route 5: POST /photos/upload - Upload new photo
// Cache: no-store (never cache POST requests)
router.post('/photos/upload', (req, res) => {
  res.set('Cache-Control', 'no-store');
  
  const { title, url, username, public: isPublic } = req.body;
  
  if (!title || !url || !username) {
    return res.status(400).json({ error: 'Missing required fields: title, url, username' });
  }
  
  const newPhoto = {
    id: photos.length + 1,
    title,
    url,
    username,
    public: isPublic !== false, // Default to public
  };
  
  photos.push(newPhoto);
  
  res.status(201).json({
    message: 'Photo uploaded successfully',
    photo: newPhoto
  });
});

module.exports = router;
