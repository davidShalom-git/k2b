const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const hotelRoutes = require('./router/Hotel');
const waiterRoutes = require('./router/Waiter');
const { initializeTables } = require('./utils/hotelUtils');
require('dotenv').config();

const app = express();

// CORS configuration
const corsOptions = {
  origin: ['http://localhost:6500', 'https://your-frontend-domain.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api/hotel', hotelRoutes);
app.use('/api/hotel', waiterRoutes);

// MongoDB connection
mongoose.connect(process.env.MONGODB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log('✅ MongoDB Connected');
  await initializeTables(); // Optional: only if needed on startup
})
.catch((err) => {
  console.error('❌ MongoDB connection error:', err);
});

// Export app for Vercel or testing
module.exports = app;