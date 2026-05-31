const express = require('express');
const User = require('../models/User');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Get all users (admin only)
router.get('/', adminOnly, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user profile
router.get('/profile/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update user profile
router.put('/profile/:id', auth, async (req, res) => {
  try {
    if (req.params.id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { name, phone, address, city, country, profileImage } = req.body;
    const allowed = { name, phone, address, city, country, profileImage };
    Object.keys(allowed).forEach(k => allowed[k] === undefined && delete allowed[k]);

    const user = await User.findByIdAndUpdate(req.params.id, allowed, { new: true, runValidators: true }).select('-password');
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Admin: update any user (name, phone, city, role)
router.put('/:id', adminOnly, async (req, res) => {
  try {
    const { name, phone, city, role } = req.body;
    const allowed = {};
    if (name  !== undefined) allowed.name  = name;
    if (phone !== undefined) allowed.phone = phone;
    if (city  !== undefined) allowed.city  = city;
    if (role  !== undefined) allowed.role  = role;
    const user = await User.findByIdAndUpdate(req.params.id, allowed, { new: true, runValidators: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete user (admin only)
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
