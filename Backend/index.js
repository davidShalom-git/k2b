const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const hotelRoutes = require('./router/Hotel');
const waiterRoutes = require('./router/Waiter');
const { initializeTables, initializeMenuItems } = require('./utils/hotelUtils');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Test route
app.get('/', (req, res) => {
  res.json({ 
    message: 'K2B Hotel API is running!', 
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/hotel', hotelRoutes);
app.use('/api/waiter', waiterRoutes);

// MongoDB connection
mongoose.connect(process.env.MONGODB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log('✅ MongoDB Connected');
  try {
    await initializeMenuItems();
    await initializeTables();
  } catch (error) {
    console.error('Initialization error:', error);
  }
})
.catch((err) => {
  console.error('❌ MongoDB connection error:', err);
});

// Export for Vercel
module.exports = app;