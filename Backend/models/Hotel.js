const mongoose = require('mongoose');

// MenuItem Schema
const menuItemSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, default: 'main' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Table Schema
const tableSchema = new mongoose.Schema({
  tableId: { type: Number, required: true, unique: true }, // add unique for safety
  status: { 
    type: String, 
    enum: ['available', 'occupied', 'billed', 'paid'], 
    default: 'available' 
  },
  orders: { 
    type: Map, 
    of: Number, 
    default: new Map() 
  },
  total: { type: Number, default: 0 },
  orderTime: { type: String, default: null },
  billTime: { type: String, default: null },
  payTime: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Remove this line, it's not needed for static tables:
// tableSchema.index({ tableId: 1, currentDate: 1 }, { unique: true });

// Compound index for tableId and currentDate
tableSchema.index({ tableId: 1, currentDate: 1 }, { unique: true });

// DailyStats Schema
const dailyStatsSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true }, // YYYY-MM-DD format
  totalRevenue: { type: Number, default: 0 },
  totalOrders: { type: Number, default: 0 },
  avgOrderValue: { type: Number, default: 0 },
  popularItems: { 
    type: Map, 
    of: {
      quantity: Number,
      revenue: Number
    },
    default: new Map() 
  },
  completedOrders: [{
    tableId: Number,
    total: Number,
    orders: Map,
    orderTime: String,
    billTime: String,
    payTime: String,
    completedAt: String
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const MenuItem = mongoose.model('MenuItem', menuItemSchema);
const Table = mongoose.model('Table', tableSchema);
const DailyStats = mongoose.model('DailyStats', dailyStatsSchema);

module.exports = { MenuItem, Table, DailyStats };