const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { MenuItem, Table, Bill, Revenue, Settings, Manager } = require('../models/Hotel');

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware to verify manager token
const verifyManager = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token provided' });
    const decoded = jwt.verify(token, JWT_SECRET);
    const manager = await Manager.findById(decoded.id);
    if (!manager || !manager.isActive) return res.status(401).json({ error: 'Invalid token or manager not active' });
    req.manager = manager;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Initialize default manager
const initializeManager = async () => {
  try {
    if (!(await Manager.countDocuments())) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await Manager.create({
        username: 'admin',
        password: hashedPassword,
        email: 'admin@restaurant.com',
        role: 'manager',
        isActive: true,
      });
      console.log('Default manager created - Username: admin, Password: admin123');
    }
  } catch (error) {
    console.error('Error initializing manager:', error);
  }
};

// Initialize tables
const initializeTables = async () => {
  try {
    if (!(await Table.countDocuments())) {
      const tables = Array.from({ length: 40 }, (_, i) => ({
        tableNumber: i + 1,
        isAC: i < 5,
        status: 'available',
        orders: [],
      }));
      await Table.insertMany(tables);
      console.log('40 tables initialized');
    }
  } catch (error) {
    console.error('Error initializing tables:', error);
  }
};

// Initialize settings
const initializeSettings = async () => {
  try {
    if (!(await Settings.findOne())) {
      await Settings.create({
        gstRate: 18,
        restaurantName: 'My Restaurant',
        address: '123 Main Street',
        phone: '+91 9876543210',
      });
      console.log('Settings initialized');
    }
  } catch (error) {
    console.error('Error initializing settings:', error);
  }
};

// Authentication Routes
router.post('/manager/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    const manager = await Manager.findOne({ username });
    if (!manager || !manager.isActive || !(await bcrypt.compare(password, manager.password)))
      return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: manager._id, username: manager.username, role: manager.role }, JWT_SECRET, { expiresIn: '24h' });
    manager.lastLogin = new Date();
    await manager.save();
    res.json({ token, manager: { id: manager._id, username: manager.username, email: manager.email, role: manager.role } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Menu Routes (Public for waiters)
router.get('/menu', async (req, res) => {
  try {
    const menuItems = await MenuItem.find({ available: true }).sort({ category: 1, name: 1 });
    res.json(menuItems);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/menu/all', async (req, res) => {
  try {
    const menuItems = await MenuItem.find().sort({ category: 1, name: 1 });
    res.json(menuItems);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/menu', async (req, res) => {
  try {
    const { name, price, category, description } = req.body;
    if (!name || !price || !category) return res.status(400).json({ error: 'Name, price, and category required' });
    if (await MenuItem.findOne({ name, category })) return res.status(400).json({ error: 'Menu item already exists' });
    const menuItem = new MenuItem({ name, price, category, description });
    await menuItem.save();
    res.status(201).json(menuItem);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/menu/:id', async (req, res) => {
  try {
    const menuItem = await MenuItem.findByIdAndUpdate(req.params.id, { ...req.body, updatedAt: new Date() }, { new: true });
    if (!menuItem) return res.status(404).json({ error: 'Menu item not found' });
    res.json(menuItem);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/menu/:id', async (req, res) => {
  try {
    const menuItem = await MenuItem.findByIdAndUpdate(req.params.id, { available: false, updatedAt: new Date() }, { new: true });
    if (!menuItem) return res.status(404).json({ error: 'Menu item not found' });
    res.json({ message: 'Menu item deleted' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/menu/categories', async (req, res) => {
  try {
    const categories = await MenuItem.distinct('category');
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Table Routes (Public)
router.get('/tables', async (req, res) => {
  try {
    const tables = await Table.find().sort({ tableNumber: 1 });
    res.json(tables);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/tables/:tableNumber/orders', async (req, res) => {
  try {
    const { tableNumber } = req.params;
    const { menuItemId, quantity } = req.body;
    const menuItem = await MenuItem.findById(menuItemId);
    if (!menuItem || !menuItem.available) return res.status(404).json({ error: 'Menu item not found or unavailable' });
    const table = await Table.findOne({ tableNumber: parseInt(tableNumber) });
    if (!table) return res.status(404).json({ error: 'Table not found' });
    const orderIndex = table.orders.findIndex((order) => order.menuItemId.toString() === menuItemId);
    if (orderIndex !== -1) {
      table.orders[orderIndex].quantity += quantity;
      table.orders[orderIndex].amount = table.orders[orderIndex].quantity * table.orders[orderIndex].price;
    } else {
      table.orders.push({ menuItemId, name: menuItem.name, price: menuItem.price, quantity, amount: menuItem.price * quantity });
    }
    table.subtotal = table.orders.reduce((sum, order) => sum + order.amount, 0);
    table.status = 'occupied';
    table.lastUpdated = new Date();
    await table.save();
    res.json(table);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/tables/:tableNumber/orders/:orderIndex', async (req, res) => {
  try {
    const { tableNumber, orderIndex } = req.params;
    const { quantity } = req.body;
    const table = await Table.findOne({ tableNumber: parseInt(tableNumber) });
    if (!table) return res.status(404).json({ error: 'Table not found' });
    if (quantity <= 0) {
      table.orders.splice(parseInt(orderIndex), 1);
    } else {
      table.orders[parseInt(orderIndex)].quantity = quantity;
      table.orders[parseInt(orderIndex)].amount = table.orders[parseInt(orderIndex)].price * quantity;
    }
    table.subtotal = table.orders.reduce((sum, order) => sum + order.amount, 0);
    table.status = table.orders.length ? 'occupied' : 'available';
    table.lastUpdated = new Date();
    await table.save();
    res.json(table);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/tables/:tableNumber/bill', async (req, res) => {
  try {
    const { tableNumber } = req.params;
    const table = await Table.findOne({ tableNumber: parseInt(tableNumber) });
    if (!table || !table.orders.length) return res.status(400).json({ error: 'No orders found' });
    const settings = await Settings.findOne();
    const gstRate = settings?.gstRate || 18;
    const subtotal = table.subtotal;
    const gstAmount = (subtotal * gstRate) / 100;
    const totalAmount = subtotal + gstAmount;
    const today = new Date().toISOString().split('T')[0];
    const billCount = await Bill.countDocuments({ date: today });
    const billNumber = `BILL-${today}-${String(billCount + 1).padStart(4, '0')}`;
    const bill = new Bill({ billNumber, tableNumber: parseInt(tableNumber), orders: table.orders, subtotal, gstRate, gstAmount, totalAmount, date: today });
    await bill.save();
    table.status = 'billed';
    table.gstAmount = gstAmount;
    table.totalAmount = totalAmount;
    await table.save();
    let revenue = await Revenue.findOne({ date: today });
    if (!revenue) revenue = new Revenue({ date: today, totalRevenue: 0, totalOrders: 0, bills: [] });
    revenue.totalRevenue += totalAmount;
    revenue.totalOrders += 1;
    revenue.bills.push(bill._id);
    await revenue.save();
    res.json({ bill, table });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/tables/:tableNumber/clear', async (req, res) => {
  try {
    const table = await Table.findOneAndUpdate(
      { tableNumber: parseInt(req.params.tableNumber) },
      { status: 'available', orders: [], subtotal: 0, gstAmount: 0, totalAmount: 0, lastUpdated: new Date() },
      { new: true }
    );
    if (!table) return res.status(404).json({ error: 'Table not found' });
    res.json(table);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bill Routes (Public)
// ...existing code...

// Bill Routes (Public)
router.get('/bills', async (req, res) => {
  try {
    const { date, page = 1, limit = 50 } = req.query;
    const query = date ? { date } : {};
    const bills = await Bill.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((page - 1) * limit);
    const total = await Bill.countDocuments(query);
    res.json({ bills: bills, totalPages: Math.ceil(total / limit), currentPage: Number(page), total });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Revenue Routes (Public for waiters)
router.get('/revenue/daily', async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];
    const revenue = await Revenue.findOne({ date: targetDate }).populate('bills');
    res.json(revenue || { date: targetDate, totalRevenue: 0, totalOrders: 0, bills: [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



// Dashboard Stats (Public)
router.get('/dashboard/stats', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const todayRevenue = await Revenue.findOne({ date: today });
    const tables = await Table.find();
    const tableStats = {
      available: tables.filter(t => t.status === 'available').length,
      occupied: tables.filter(t => t.status === 'occupied').length,
      billed: tables.filter(t => t.status === 'billed').length
    };
    const recentBills = await Bill.find().sort({ createdAt: -1 }).limit(5);
    res.json({
      todayRevenue: todayRevenue ? todayRevenue.totalRevenue : 0,
      todayOrders: todayRevenue ? todayRevenue.totalOrders : 0,
      tableStats: tableStats,
      recentBills: recentBills
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manager Dashboard Stats Only(Protected)
router.get('/manager/dashboard/stats', verifyManager, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const [todayRevenue, yesterdayRevenue, totalMenuItems, activeMenuItems] = await Promise.all([
      Revenue.findOne({ date: today }),
      Revenue.findOne({ date: yesterday }),
      MenuItem.countDocuments(),
      MenuItem.countDocuments({ available: true })
    ]);
    const tables = await Table.find();
    const tableStats = {
      available: tables.filter(t => t.status === 'available').length,
      occupied: tables.filter(t => t.status === 'occupied').length,
      billed: tables.filter(t => t.status === 'billed').length,
      total: tables.length
    };
    const recentBills = await Bill.find().sort({ createdAt: -1 }).limit(10);
    res.json({
      todayRevenue: todayRevenue ? todayRevenue.totalRevenue : 0,
      todayOrders: todayRevenue ? todayRevenue.totalOrders : 0,
      yesterdayRevenue: yesterdayRevenue ? yesterdayRevenue.totalRevenue : 0,
      yesterdayOrders: yesterdayRevenue ? yesterdayRevenue.totalOrders : 0,
      tableStats,
      menuStats: { total: totalMenuItems, active: activeMenuItems, inactive: totalMenuItems - activeMenuItems },
      recentBills
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Settings Routes (Public for waiters)
router.get('/settings', async (req, res) => {
  try {
    const settings = await Settings.findOne();
    res.json(settings || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/settings', async (req, res) => {
  try {
    const settings = await Settings.findOneAndUpdate({}, { ...req.body, lastUpdated: new Date() }, { new: true, upsert: true });
    res.json(settings);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Initialize database
const initializeDatabase = async () => {
  await initializeTables();
  await initializeSettings();
  await initializeManager();
};

module.exports = { router, initializeDatabase };