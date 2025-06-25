const mongoose = require('mongoose');

// Manager Schema
const managerSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 50 },
  password: { type: String, required: true, minlength: 6 },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  role: { type: String, enum: ['manager', 'admin'], default: 'manager' },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now },
  lastUpdated: { type: Date, default: Date.now }
});

// Menu Item Schema
const menuItemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  category: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  available: { type: Boolean, default: true },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Manager' },
  lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Manager' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Table Schema
const tableSchema = new mongoose.Schema({
  tableNumber: { type: Number, required: true, unique: true },
  isAC: { type: Boolean, default: false },
  status: { type: String, enum: ['available', 'occupied', 'billed'], default: 'available' },
  orders: [{
    menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    amount: { type: Number, required: true }
  }],
  subtotal: { type: Number, default: 0 },
  gstAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now }
});

// Bill Schema
const billSchema = new mongoose.Schema({
  billNumber: { type: String, required: true, unique: true },
  tableNumber: { type: Number, required: true },
  orders: [{
    menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
    name: String,
    price: Number,
    quantity: Number,
    amount: Number
  }],
  subtotal: { type: Number, required: true },
  gstRate: { type: Number, required: true },
  gstAmount: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  date: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Revenue Schema
const revenueSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true },
  totalRevenue: { type: Number, default: 0 },
  totalOrders: { type: Number, default: 0 },
  bills: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Bill' }],
  createdAt: { type: Date, default: Date.now }
});

// Settings Schema
const settingsSchema = new mongoose.Schema({
  gstRate: { type: Number, required: true, min: 0, max: 100 },
  restaurantName: { type: String, required: true, trim: true },
  address: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  email: { type: String, trim: true },
  logo: { type: String },
  currency: { type: String, default: 'INR' },
  timezone: { type: String, default: 'Asia/Kolkata' },
  createdAt: { type: Date, default: Date.now },
  lastUpdated: { type: Date, default: Date.now }
});

// Indexes
menuItemSchema.index({ category: 1, available: 1 });
tableSchema.index({ tableNumber: 1 });
tableSchema.index({ status: 1 });
billSchema.index({ date: 1 });
billSchema.index({ billNumber: 1 });
revenueSchema.index({ date: 1 });
managerSchema.index({ username: 1 });
managerSchema.index({ email: 1 });

// Models
const Manager = mongoose.model('Manager', managerSchema);
const MenuItem = mongoose.model('MenuItem', menuItemSchema);
const Table = mongoose.model('Table', tableSchema);
const Bill = mongoose.model('Bill', billSchema);
const Revenue = mongoose.model('Revenue', revenueSchema);
const Settings = mongoose.model('Settings', settingsSchema);

module.exports = { Manager, MenuItem, Table, Bill, Revenue, Settings };