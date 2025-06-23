const express = require('express')
const app = express()
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
const cors = require('cors')
const hotel = require('./router/Hotel')
const Waiter = require('./router/Waiter.js')
const { initializeTables } = require('./utils/hotelUtils'); 
require('dotenv').config()

app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.use('/api/hotel',hotel)
app.use('/api/hotel',Waiter)

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/hotel_management')
  .then(async () => {
    console.log("MongoDB Connected");
    await initializeTables(); // Initialize 40 tables here
    app.listen(3000,()=> {
      console.log("Server is running on port 3000")
    });
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
  });


