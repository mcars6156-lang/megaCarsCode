const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mega_cars')
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => {
    console.log('⚠️  MongoDB connection warning:', err.message);
    console.log('💡 Tip: Install MongoDB with: brew install mongodb-community');
    console.log('💡 Or use MongoDB Atlas (cloud): https://www.mongodb.com/cloud/atlas');
  });

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/cars', require('./routes/cars'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/users', require('./routes/users'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/customization', require('./routes/customization'));
app.use('/api/expenses', require('./routes/expenses'));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// Fallback: serve index.html for any unmatched route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
