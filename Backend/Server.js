const express = require('express');
const app = express();
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const hotel = require('./router/Hotel');
const Waiter = require('./router/Waiter.js');
const { initializeTables } = require('./utils/hotelUtils');
require('dotenv').config();

const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost:6500', 'https://chengam.vercel.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
};

app.use(cors(corsOptions));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.options('/api/hotel/login', cors(corsOptions)); // Handle OPTIONS for login
app.use('/api/hotel', hotel);
app.use('/api/hotel', Waiter);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URL)
  .then(async () => {
    console.log("MongoDB Connected");
    await initializeTables();
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
  });

// Export the app for Vercel
module.exports = app;