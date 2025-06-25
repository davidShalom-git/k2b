const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true },
  available: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const orderSchema = new mongoose.Schema({
  menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
  name: String,
  price: Number,
  quantity: { type: Number, required: true },
  amount: Number
});

const tableSchema = new mongoose.Schema({
  tableNumber: { type: Number, required: true, unique: true },
  isAC: { type: Boolean, default: false },
  status: { type: String, enum: ['available', 'occupied', 'billed'], default: 'available' },
  orders: [orderSchema],
  subtotal: { type: Number, default: 0 },
  gstAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now }
});

const billSchema = new mongoose.Schema({
  billNumber: { type: String, required: true, unique: true },
  tableNumber: { type: Number, required: true },
  orders: [orderSchema],
  subtotal: { type: Number, required: true },
  gstRate: { type: Number, required: true },
  gstAmount: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  paymentStatus: { type: String, enum: ['pending', 'paid'], default: 'paid' },
  createdAt: { type: Date, default: Date.now },
  date: { type: String, required: true } // YYYY-MM-DD format
});

const revenueSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true }, // YYYY-MM-DD format
  totalRevenue: { type: Number, default: 0 },
  totalOrders: { type: Number, default: 0 },
  bills: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Bill' }],
  createdAt: { type: Date, default: Date.now }
});

const settingsSchema = new mongoose.Schema({
  gstRate: { type: Number, default: 18 },
  restaurantName: { type: String, default: 'Restaurant' },
  address: { type: String, default: '' },
  phone: { type: String, default: '' },
  lastUpdated: { type: Date, default: Date.now }
});

// Create Models
const MenuItem = mongoose.model('MenuItem', menuItemSchema);
const Table = mongoose.model('Table', tableSchema);
const Bill = mongoose.model('Bill', billSchema);
const Revenue = mongoose.model('Revenue', revenueSchema);
const Settings = mongoose.model('Settings', settingsSchema);

// Export Models
module.exports = {
  MenuItem,
  Table,  
  Bill,
  Revenue,
  Settings
  };