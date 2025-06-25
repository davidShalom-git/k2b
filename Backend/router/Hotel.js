const express = require('express');
const router = express.Router();
const { MenuItem, Table, Bill, Revenue, Settings } = require('../models/Hotel');


const initializeTables = async () => {
  try {
    const existingTables = await Table.countDocuments();
    if (existingTables === 0) {
      const tables = [];
      for (let i = 1; i <= 40; i++) {
        tables.push({
          tableNumber: i,
          isAC: i <= 5,
          status: 'available',
          orders: []
        });
      }
      await Table.insertMany(tables);
      console.log('40 tables initialized');
    }
  } catch (error) {
    console.error('Error initializing tables:', error);
  }
};

// Initialize Settings
const initializeSettings = async () => {
  try {
    const settings = await Settings.findOne();
    if (!settings) {
      await Settings.create({
        gstRate: 18,
        restaurantName: 'My Restaurant',
        address: '123 Main Street',
        phone: '+91 9876543210'
      });
      console.log('Settings initialized');
    }
  } catch (error) {
    console.error('Error initializing settings:', error);
  }
};

// API Routes

// Menu Items Routes
router.get('/api/menu', async (req, res) => {
  try {
    const menuItems = await MenuItem.find({ available: true }).sort({ category: 1, name: 1 });
    res.json(menuItems);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/menu', async (req, res) => {
  try {
    const { name, price, category } = req.body;
    const menuItem = new MenuItem({ name, price, category });
    await menuItem.save();
    res.status(201).json(menuItem);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/api/menu/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body, updatedAt: new Date() };
    const menuItem = await MenuItem.findByIdAndUpdate(id, updateData, { new: true });
    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    res.json(menuItem);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/api/menu/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const menuItem = await MenuItem.findByIdAndUpdate(id, { available: false }, { new: true });
    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    res.json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Tables Routes
router.get('/api/tables', async (req, res) => {
  try {
    const tables = await Table.find().sort({ tableNumber: 1 });
    res.json(tables);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/api/tables/:tableNumber', async (req, res) => {
  try {
    const { tableNumber } = req.params;
    const table = await Table.findOne({ tableNumber: parseInt(tableNumber) });
    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }
    res.json(table);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add item to table order
router.post('/api/tables/:tableNumber/orders', async (req, res) => {
  try {
    const { tableNumber } = req.params;
    const { menuItemId, quantity } = req.body;
    
    const menuItem = await MenuItem.findById(menuItemId);
    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    
    const table = await Table.findOne({ tableNumber: parseInt(tableNumber) });
    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }
    
    // Check if item already exists in order
    const existingOrderIndex = table.orders.findIndex(
      order => order.menuItemId.toString() === menuItemId
    );
    
    if (existingOrderIndex !== -1) {
      // Update existing order
      table.orders[existingOrderIndex].quantity += quantity;
      table.orders[existingOrderIndex].amount = 
        table.orders[existingOrderIndex].quantity * table.orders[existingOrderIndex].price;
    } else {
      // Add new order
      table.orders.push({
        menuItemId,
        name: menuItem.name,
        price: menuItem.price,
        quantity,
        amount: menuItem.price * quantity
      });
    }
    
    // Calculate totals
    table.subtotal = table.orders.reduce((sum, order) => sum + order.amount, 0);
    table.status = 'occupied';
    table.lastUpdated = new Date();
    
    await table.save();
    res.json(table);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update order quantity
router.put('/api/tables/:tableNumber/orders/:orderIndex', async (req, res) => {
  try {
    const { tableNumber, orderIndex } = req.params;
    const { quantity } = req.body;
    
    const table = await Table.findOne({ tableNumber: parseInt(tableNumber) });
    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }
    
    if (quantity <= 0) {
      // Remove item if quantity is 0 or less
      table.orders.splice(parseInt(orderIndex), 1);
    } else {
      // Update quantity
      table.orders[parseInt(orderIndex)].quantity = quantity;
      table.orders[parseInt(orderIndex)].amount = 
        table.orders[parseInt(orderIndex)].price * quantity;
    }
    
    // Recalculate totals
    table.subtotal = table.orders.reduce((sum, order) => sum + order.amount, 0);
    
    // Update status
    if (table.orders.length === 0) {
      table.status = 'available';
    }
    
    table.lastUpdated = new Date();
    await table.save();
    res.json(table);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Generate Bill
router.post('/api/tables/:tableNumber/bill', async (req, res) => {
  try {
    const { tableNumber } = req.params;
    const table = await Table.findOne({ tableNumber: parseInt(tableNumber) });
    
    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }
    
    if (table.orders.length === 0) {
      return res.status(400).json({ error: 'No orders found for this table' });
    }
    
    // Get current settings
    const settings = await Settings.findOne();
    const gstRate = settings ? settings.gstRate : 18;
    
    // Calculate amounts
    const subtotal = table.orders.reduce((sum, order) => sum + order.amount, 0);
    const gstAmount = (subtotal * gstRate) / 100;
    const totalAmount = subtotal + gstAmount;
    
    // Generate bill number
    const today = new Date().toISOString().split('T')[0];
    const billCount = await Bill.countDocuments({ date: today });
    const billNumber = `BILL-${today}-${String(billCount + 1).padStart(4, '0')}`;
    
    // Create bill
    const bill = new Bill({
      billNumber,
      tableNumber: parseInt(tableNumber),
      orders: table.orders,
      subtotal,
      gstRate,
      gstAmount,
      totalAmount,
      date: today
    });
    
    await bill.save();
    
    // Update table
    table.status = 'billed';
    table.gstAmount = gstAmount;
    table.totalAmount = totalAmount;
    table.lastUpdated = new Date();
    await table.save();
    
    // Update daily revenue
    let revenue = await Revenue.findOne({ date: today });
    if (!revenue) {
      revenue = new Revenue({
        date: today,
        totalRevenue: 0,
        totalOrders: 0,
        bills: []
      });
    }
    
    revenue.totalRevenue += totalAmount;
    revenue.totalOrders += 1;
    revenue.bills.push(bill._id);
    await revenue.save();
    
    res.json({ bill, table });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clear Table
router.post('/api/tables/:tableNumber/clear', async (req, res) => {
  try {
    const { tableNumber } = req.params;
    const table = await Table.findOneAndUpdate(
      { tableNumber: parseInt(tableNumber) },
      {
        status: 'available',
        orders: [],
        subtotal: 0,
        gstAmount: 0,
        totalAmount: 0,
        lastUpdated: new Date()
      },
      { new: true }
    );
    
    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }
    
    res.json(table);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bills Routes
router.get('/api/bills', async (req, res) => {
  try {
    const { date, page = 1, limit = 50 } = req.query;
    const query = date ? { date } : {};
    
    const bills = await Bill.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Bill.countDocuments(query);
    
    res.json({
      bills,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/api/bills/:billNumber', async (req, res) => {
  try {
    const { billNumber } = req.params;
    const bill = await Bill.findOne({ billNumber });
    
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }
    
    res.json(bill);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Revenue Routes
router.get('/api/revenue/daily', async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    const revenue = await Revenue.findOne({ date: targetDate }).populate('bills');
    
    if (!revenue) {
      return res.json({
        date: targetDate,
        totalRevenue: 0,
        totalOrders: 0,
        bills: []
      });
    }
    
    res.json(revenue);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/api/revenue/monthly', async (req, res) => {
  try {
    const { year, month } = req.query;
    const currentYear = year || new Date().getFullYear();
    const currentMonth = month || (new Date().getMonth() + 1);
    
    const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    const endDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-31`;
    
    const revenues = await Revenue.find({
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 });
    
    const totalRevenue = revenues.reduce((sum, rev) => sum + rev.totalRevenue, 0);
    const totalOrders = revenues.reduce((sum, rev) => sum + rev.totalOrders, 0);
    
    res.json({
      month: `${currentYear}-${String(currentMonth).padStart(2, '0')}`,
      totalRevenue,
      totalOrders,
      dailyRevenues: revenues
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Settings Routes
router.get('/api/settings', async (req, res) => {
  try {
    const settings = await Settings.findOne();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/api/settings', async (req, res) => {
  try {
    const settings = await Settings.findOneAndUpdate(
      {},
      { ...req.body, lastUpdated: new Date() },
      { new: true, upsert: true }
    );
    res.json(settings);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Dashboard Stats
router.get('/api/dashboard/stats', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get today's revenue
    const todayRevenue = await Revenue.findOne({ date: today });
    
    // Get table statistics
    const tables = await Table.find();
    const tableStats = {
      available: tables.filter(t => t.status === 'available').length,
      occupied: tables.filter(t => t.status === 'occupied').length,
      billed: tables.filter(t => t.status === 'billed').length
    };
    
    // Get recent bills
    const recentBills = await Bill.find().sort({ createdAt: -1 }).limit(5);
    
    res.json({
      todayRevenue: todayRevenue ? todayRevenue.totalRevenue : 0,
      todayOrders: todayRevenue ? todayRevenue.totalOrders : 0,
      tableStats,
      recentBills
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Initialize database
const initializeDatabase = async () => {
  await initializeTables();
  await initializeSettings();
};


module.exports = {
  router,
  initializeDatabase
};
