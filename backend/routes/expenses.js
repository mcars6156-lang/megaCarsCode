const express = require('express');
const Expense = require('../models/Expense');
const { adminOnly } = require('../middleware/auth');

const router = express.Router();

router.get('/', adminOnly, async (req, res) => {
  try {
    const filter = {};
    if (req.query.startDate && req.query.endDate) {
      filter.date = { $gte: new Date(req.query.startDate), $lte: new Date(req.query.endDate) };
    }
    const expenses = await Expense.find(filter).sort({ date: -1 }).limit(200);
    res.json(expenses);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/', adminOnly, async (req, res) => {
  try {
    const expense = new Expense(req.body);
    await expense.save();
    res.status(201).json(expense);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

router.delete('/:id', adminOnly, async (req, res) => {
  try {
    await Expense.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/summary', adminOnly, async (req, res) => {
  try {
    const agg = await Expense.aggregate([
      { $group: { _id: null, totalIQD: { $sum: '$amountIQD' }, totalUSD: { $sum: '$amountUSD' }, count: { $sum: 1 } } }
    ]);
    res.json(agg[0] || { totalIQD: 0, totalUSD: 0, count: 0 });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
