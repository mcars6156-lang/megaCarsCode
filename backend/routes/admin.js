const express = require('express');
const User = require('../models/User');
const Car = require('../models/Car');
const Sale = require('../models/Sale');
const Expense = require('../models/Expense');
const { adminOnly } = require('../middleware/auth');

const router = express.Router();

// Dashboard stats
router.get('/dashboard', adminOnly, async (req, res) => {
  try {
    const totalUsers   = await User.countDocuments();
    const totalCars    = await Car.countDocuments();
    const totalSales   = await Sale.countDocuments();
    const revenueAgg   = await Sale.aggregate([{ $group: { _id: null, total: { $sum: '$salePrice' } } }]);
    const expenseAgg   = await Expense.aggregate([{ $group: { _id: null, total: { $sum: '$amountUSD' } } }]);
    const totalRevenue = revenueAgg[0]?.total || 0;
    const totalExpenses = expenseAgg[0]?.total || 0;

    // Gross profit from sold cars (salePrice - car.costPrice)
    const soldSales = await Sale.find().populate('car', 'costPrice');
    const totalCost = soldSales.reduce((s, sale) => s + (sale.car?.costPrice || 0), 0);
    const grossProfit = totalRevenue - totalCost;
    const netProfit   = grossProfit - totalExpenses;

    res.json({ totalUsers, totalCars, totalSales, totalRevenue, totalCost, grossProfit, totalExpenses, netProfit });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Financial summary (detailed)
router.get('/reports/financial', adminOnly, async (req, res) => {
  try {
    const sales    = await Sale.find().populate('car', 'brand model costPrice').populate('buyer', 'name');
    const expenses = await Expense.find().sort({ date: -1 });

    const cashTypes  = ['cash', 'check', 'bank_transfer'];
    const cashSales  = sales.filter(s => cashTypes.includes(s.paymentMethod));
    const instSales  = sales.filter(s => s.paymentMethod === 'installment');
    const cashRev    = cashSales.reduce((s, x) => s + (x.salePrice || 0), 0);
    const instRev    = instSales.reduce((s, x) => s + (x.salePrice || 0), 0);
    const totalRev   = cashRev + instRev;
    const totalCost  = sales.reduce((s, x) => s + (x.car?.costPrice || 0), 0);
    const grossProfit = totalRev - totalCost;
    const totalExp   = expenses.reduce((s, x) => s + (x.amountUSD || 0), 0);
    const netProfit  = grossProfit - totalExp;
    const profitPct  = totalCost > 0 ? ((netProfit / totalCost) * 100).toFixed(1) : 0;

    res.json({ cashRev, instRev, totalRev, totalCost, grossProfit, totalExp, netProfit, profitPct,
               cashCount: cashSales.length, instCount: instSales.length, totalSales: sales.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Manage users
router.put('/users/:id/role', adminOnly, async (req, res) => {
  try {
    const { role } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Manage cars
router.post('/cars/add', adminOnly, async (req, res) => {
  try {
    const car = new Car(req.body);
    await car.save();
    res.status(201).json(car);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Generate reports
router.get('/reports/sales', adminOnly, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let filter = {};
    
    if (startDate && endDate) {
      filter.saleDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const sales = await Sale.find(filter)
      .populate('car')
      .populate('buyer', 'name email phone')
      .populate('seller', 'name email phone');
    
    res.json(sales);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
