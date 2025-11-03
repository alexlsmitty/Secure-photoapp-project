const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const User = require('../models/User');
const Photo = require('../models/Photo');
const router = express.Router();

// GET /admin/dashboard - Admin dashboard with overview and capabilities
// Shows what an admin can do and provides quick statistics
router.get('/admin/dashboard', authMiddleware, roleMiddleware('Admin'), async (req, res) => {
  try {
    // Get statistics
    const totalUsers = await User.countDocuments();
    const adminCount = await User.countDocuments({ role: 'Admin' });
    const regularUserCount = totalUsers - adminCount;
    const totalPhotos = await Photo.countDocuments();
    const publicPhotos = await Photo.countDocuments({ public: true });
    const privatePhotos = totalPhotos - publicPhotos;

    res.json({
      message: 'Welcome to Admin Dashboard',
      admin: {
        id: req.user._id,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role
      },
      statistics: {
        users: {
          total: totalUsers,
          admins: adminCount,
          regularUsers: regularUserCount
        },
        photos: {
          total: totalPhotos,
          public: publicPhotos,
          private: privatePhotos
        }
      },
      capabilities: [
        'View all users (GET /admin/users)',
        'Promote user to admin (POST /admin/promote/:userId)',
        'Demote admin to regular user (POST /admin/demote/:userId)',
        'View all photos including private (GET /admin/photos)',
        'Delete any photo (DELETE /admin/photos/:photoId)',
        'Access this dashboard (GET /admin/dashboard)'
      ],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /admin/users - Only admins can see all users
router.get('/admin/users', authMiddleware, roleMiddleware('Admin'), async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /admin/promote/:userId - Promote a user to admin
router.post('/admin/promote/:userId', authMiddleware, roleMiddleware('Admin'), async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { role: 'Admin' },
      { new: true }
    ).select('-password');
    
    res.json({ message: 'User promoted to admin', user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /admin/demote/:userId - Demote an admin to regular user
router.post('/admin/demote/:userId', authMiddleware, roleMiddleware('Admin'), async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { role: 'User' },
      { new: true }
    ).select('-password');
    
    res.json({ message: 'User demoted to regular user', user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /admin/photos - View all photos (even private ones)
router.get('/admin/photos', authMiddleware, roleMiddleware('Admin'), async (req, res) => {
  try {
    const photos = await Photo.find({});
    res.json({ photos, count: photos.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /admin/photos/:photoId - Delete a photo
router.delete('/admin/photos/:photoId', authMiddleware, roleMiddleware('Admin'), async (req, res) => {
  try {
    const photo = await Photo.findByIdAndDelete(req.params.photoId);
    
    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    
    res.json({ message: 'Photo deleted', photo });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
