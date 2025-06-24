const mongoose = require('mongoose');

// MenuItem Schema
const menuItemSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  basePrice: { type: Number, required: true }, // Default/base price
  category: { 
    type: String, 
    enum: ['main', 'rice', 'bread', 'drinks', 'dessert', 'appetizer', 'side'], 
    default: 'main' 
  },
  description: { type: String, default: '' },
  image: { type: String, default: '' }, // URL to image
  isActive: { type: Boolean, default: true },
  isAvailable: { type: Boolean, default: true }, // For temporary unavailability
  preparationTime: { type: Number, default: 15 }, // in minutes
  ingredients: [{ type: String }], // Array of ingredients
  tags: [{ type: String }], // vegetarian, vegan, spicy, etc.
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Daily Menu Pricing Schema - for dynamic daily pricing
const dailyMenuPricingSchema = new mongoose.Schema({
  date: { type: String, required: true }, // YYYY-MM-DD format
  menuItemId: { type: Number, required: true },
  price: { type: Number, required: true },
  isAvailable: { type: Boolean, default: true },
  specialOffer: { type: String, default: '' }, // Special offer text
  discount: { type: Number, default: 0 }, // Discount percentage
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Compound index for efficient querying
dailyMenuPricingSchema.index({ date: 1, menuItemId: 1 }, { unique: true });

// Table Schema
const tableSchema = new mongoose.Schema({
  tableId: { type: Number, required: true, unique: true },
  status: { 
    type: String, 
    enum: ['available', 'occupied', 'billed', 'paid', 'reserved'], 
    default: 'available' 
  },
  capacity: { type: Number, default: 4 }, // Number of seats
  location: { type: String, default: '' }, // e.g., 'Window', 'Corner', 'Center'
  orders: { 
    type: Map, 
    of: Number, 
    default: new Map() 
  },
  total: { type: Number, default: 0 },
  orderTime: { type: String, default: null },
  billTime: { type: String, default: null },
  payTime: { type: String, default: null },
  customerName: { type: String, default: '' },
  customerPhone: { type: String, default: '' },
  notes: { type: String, default: '' }, // Special instructions
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Remove the compound index since we're not using currentDate anymore
// tableSchema.index({ tableId: 1, currentDate: 1 }, { unique: true });

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
    completedAt: String,
    customerName: String,
    customerPhone: String,
    paymentMethod: String // cash, card, upi, etc.
  }],
  isFinalized: { type: Boolean, default: false },
  finalizedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Restaurant Settings Schema (for dynamic configuration)
const restaurantSettingsSchema = new mongoose.Schema({
  name: { type: String, required: true, default: 'My Restaurant' },
  address: { type: String, default: '' },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  currency: { type: String, default: '₹' },
  taxRate: { type: Number, default: 0 }, // as percentage
  serviceCharge: { type: Number, default: 0 }, // as percentage
  openingTime: { type: String, default: '09:00' },
  closingTime: { type: String, default: '22:00' },
  workingDays: [{ type: String }], // ['Monday', 'Tuesday', ...]
  logo: { type: String, default: '' }, // URL to logo
  theme: {
    primaryColor: { type: String, default: '#2563eb' },
    secondaryColor: { type: String, default: '#64748b' },
    backgroundColor: { type: String, default: '#f8fafc' }
  },
  features: {
    enableReservations: { type: Boolean, default: false },
    enableCustomerInfo: { type: Boolean, default: false },
    enableTableNotes: { type: Boolean, default: false },
    enableInventory: { type: Boolean, default: false },
    enableLoyalty: { type: Boolean, default: false }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Inventory Schema (optional for advanced features)
const inventorySchema = new mongoose.Schema({
  itemName: { type: String, required: true },
  currentStock: { type: Number, default: 0 },
  minStockLevel: { type: Number, default: 0 },
  unit: { type: String, default: 'kg' }, // kg, liters, pieces, etc.
  costPerUnit: { type: Number, default: 0 },
  supplier: { type: String, default: '' },
  lastRestocked: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const MenuItem = mongoose.model('MenuItem', menuItemSchema);
const DailyMenuPricing = mongoose.model('DailyMenuPricing', dailyMenuPricingSchema);
const Table = mongoose.model('Table', tableSchema);
const DailyStats = mongoose.model('DailyStats', dailyStatsSchema);
const RestaurantSettings = mongoose.model('RestaurantSettings', restaurantSettingsSchema);
const Inventory = mongoose.model('Inventory', inventorySchema);

module.exports = { 
  MenuItem, 
  DailyMenuPricing,
  Table, 
  DailyStats, 
  RestaurantSettings, 
  Inventory 
};