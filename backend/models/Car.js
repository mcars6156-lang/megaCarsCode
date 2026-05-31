const mongoose = require('mongoose');

const CarSchema = new mongoose.Schema({
  brand: {
    type: String,
    required: true
  },
  model: {
    type: String,
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  costPrice: {
    type: Number,
    default: 0
  },
  mileage: {
    type: Number,
    required: true
  },
  color: String,
  fuel: {
    type: String,
    enum: ['petrol', 'diesel', 'hybrid', 'electric'],
    default: 'petrol'
  },
  transmission: {
    type: String,
    enum: ['manual', 'automatic'],
    default: 'automatic'
  },
  bodyType: {
    type: String,
    enum: ['sedan', 'suv', 'hatchback', 'coupe', 'pickup', 'van'],
    default: 'sedan'
  },
  condition: {
    type: String,
    enum: ['new', 'used', 'certified'],
    default: 'used'
  },
  description: String,
  images: [String],
  vin: {
    type: String,
    unique: true,
    sparse: true
  },
  plateNumber: String,
  status: {
    type: String,
    enum: ['available', 'sold', 'pending', 'in-service'],
    default: 'available'
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  features: [String],
  engineSize: String,
  horsepower: Number,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Car', CarSchema);
