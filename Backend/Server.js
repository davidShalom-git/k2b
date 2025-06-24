const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const hotelRoutes = require('./router/Hotel');
const waiterRoutes = require('./router/Waiter');
const { initializeTables, initializeMenuItems } = require('./utils/hotelUtils');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/api/hotel', hotelRoutes);
app.use('/api/hotel', waiterRoutes);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log('✅ MongoDB Connected');
  await initializeMenuItems();
  await initializeTables();
})
.catch((err) => {
  console.error('❌ MongoDB connection error:', err);
});

// For local development
const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// ✅ Export the app for Vercel
module.exports = app;