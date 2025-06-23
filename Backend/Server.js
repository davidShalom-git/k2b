const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const hotelRoutes = require('./router/Hotel');
const waiterRoutes = require('./router/Waiter');
const { initializeTables, initializeMenuItems } = require('./utils/hotelUtils');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Connect to MongoDB first
mongoose.connect(process.env.MONGODB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log('✅ MongoDB Connected');

  // Initialize data only after connection is ready
  await initializeMenuItems();
  await initializeTables();

  // Register routes after DB is ready
  app.use('/api/hotel', hotelRoutes);
  app.use('/api/hotel', waiterRoutes);

  // Start server (only for local dev or non-Vercel platforms)
  app.listen(3000, () => {
    console.log('🚀 Server is running on port 3000');
  });
})
.catch((err) => {
  console.error('❌ MongoDB connection error:', err);
});