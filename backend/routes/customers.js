const express = require('express');
const Customer = require('../models/Customer');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Get all customers (admin only)
router.get('/', adminOnly, async (req, res) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single customer
router.get('/:id', auth, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create customer
router.post('/', adminOnly, async (req, res) => {
  try {
    const { name, email, phone, city, address, idType, idNumber, dob, notes } = req.body;
    if (!name || !phone) return res.status(400).json({ message: 'Name and phone are required' });

    const customer = new Customer({ name, email, phone, city, address, idType, idNumber, dob, notes });
    await customer.save();
    res.status(201).json(customer);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update customer
router.put('/:id', adminOnly, async (req, res) => {
  try {
    const { name, email, phone, city, address, idType, idNumber, dob, notes } = req.body;
    const allowed = {};
    if (name !== undefined) allowed.name = name;
    if (email !== undefined) allowed.email = email;
    if (phone !== undefined) allowed.phone = phone;
    if (city !== undefined) allowed.city = city;
    if (address !== undefined) allowed.address = address;
    if (idType !== undefined) allowed.idType = idType;
    if (idNumber !== undefined) allowed.idNumber = idNumber;
    if (dob !== undefined) allowed.dob = dob;
    if (notes !== undefined) allowed.notes = notes;
    allowed.updatedAt = Date.now();

    const customer = await Customer.findByIdAndUpdate(req.params.id, allowed, { new: true, runValidators: true });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json(customer);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete customer
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json({ message: 'Customer deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get customer stats
router.get('/stats/summary', adminOnly, async (req, res) => {
  try {
    const totalCustomers = await Customer.countDocuments();
    const cityStats = await Customer.aggregate([
      { $group: { _id: '$city', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    res.json({ totalCustomers, byCity: cityStats });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
