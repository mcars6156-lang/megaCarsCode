const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema({
  description: { type: String, required: true },
  category: {
    type: String,
    enum: ['cleaning', 'rent', 'salary', 'transport', 'maintenance', 'purchase', 'utilities', 'other'],
    default: 'other'
  },
  date:          { type: Date,   default: Date.now },
  amountIQD:     { type: Number, default: 0 },
  amountUSD:     { type: Number, default: 0 },
  exchangeRate:  { type: Number, default: 1490 },
  paymentMethod: { type: String, enum: ['cash_iqd', 'bank_iqd', 'cash_usd'], default: 'cash_iqd' },
  createdBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt:     { type: Date, default: Date.now }
});

module.exports = mongoose.model('Expense', ExpenseSchema);
