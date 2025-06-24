const express = require('express');
const router = express.Router();
const { DailyStats, Table, MenuItem, DailyMenuPricing, RestaurantSettings } = require('../models/Hotel');
const { 
  getCurrentDate, 
  getCurrentTime,
  initializeDailyStats, 
  calculatePopularItems,
  getNextMenuItemId,
  getNextTableId,
  getMenuWithDailyPricing,
  updateDailyStats,
  getAvailableTables,
  getOccupiedTables,
  formatCurrency,
  isValidStatusTransition
} = require('../utils/hotelUtils');
const cron = require('node-cron');

// Middleware for request validation
const validateRequest = (requiredFields) => {
  return (req, res, next) => {
    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: `Missing required fields: ${missingFields.join(', ')}` 
      });
    }
    next();
  };
};

// Middleware for manager authentication (basic - should be improved for production)
const authenticateManager = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token !== 'manager_authenticated') {
    return res.status(401).json({ error: 'Unauthorized access' });
  }
  next();
};

// ======================== MENU MANAGEMENT ROUTES ========================

// Get active menu with daily pricing
router.get('/menu', async (req, res) => {
  try {
    const date = req.query.date || getCurrentDate();
    const menuWithPricing = await getMenuWithDailyPricing(date);
    res.json(menuWithPricing);
  } catch (error) {
    console.error('Error fetching menu:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all menu items (including inactive ones for management)
router.get('/menu/all', authenticateManager, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const menuItems = await MenuItem.find({})
      .sort({ id: 1 })
      .skip(skip)
      .limit(limit);
    
    const total = await MenuItem.countDocuments({});

    res.json({
      items: menuItems,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching all menu items:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add new menu item
router.post('/menu', 
  authenticateManager,
  validateRequest(['name', 'basePrice']),
  async (req, res) => {
    try {
      const { 
        name, 
        basePrice, 
        category, 
        description, 
        image, 
        preparationTime, 
        ingredients, 
        tags 
      } = req.body;

      // Validate base price
      if (isNaN(parseFloat(basePrice)) || parseFloat(basePrice) <= 0) {
        return res.status(400).json({ error: 'Base price must be a positive number' });
      }

      const id = await getNextMenuItemId();
      
      const newMenuItem = new MenuItem({
        id,
        name: name.trim(),
        basePrice: parseFloat(basePrice),
        category: category || 'main',
        description: description || '',
        image: image || '',
        preparationTime: preparationTime || 15,
        ingredients: ingredients || [],
        tags: tags || [],
        isActive: true
      });

      await newMenuItem.save();
      res.status(201).json(newMenuItem);
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({ error: 'Menu item with this ID already exists' });
      }
      console.error('Error creating menu item:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Update menu item
router.put('/menu/:id', authenticateManager, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };
    
    // Validate ID
    if (isNaN(parseInt(id))) {
      return res.status(400).json({ error: 'Invalid menu item ID' });
    }

    // Validate basePrice if provided
    if (updates.basePrice !== undefined) {
      if (isNaN(parseFloat(updates.basePrice)) || parseFloat(updates.basePrice) <= 0) {
        return res.status(400).json({ error: 'Base price must be a positive number' });
      }
      updates.basePrice = parseFloat(updates.basePrice);
    }

    updates.updatedAt = new Date();
    
    const updatedMenuItem = await MenuItem.findOneAndUpdate(
      { id: parseInt(id) },
      updates,
      { new: true, runValidators: true }
    );

    if (!updatedMenuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    res.json(updatedMenuItem);
  } catch (error) {
    console.error('Error updating menu item:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete menu item (soft delete)
router.delete('/menu/:id', authenticateManager, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (isNaN(parseInt(id))) {
      return res.status(400).json({ error: 'Invalid menu item ID' });
    }
    
    const updatedMenuItem = await MenuItem.findOneAndUpdate(
      { id: parseInt(id) },
      { isActive: false, updatedAt: new Date() },
      { new: true }
    );

    if (!updatedMenuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    res.json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    res.status(500).json({ error: error.message });
  }
});

// Bulk upload menu items
router.post('/menu/bulk', 
  authenticateManager, 
  validateRequest(['menuItems']),
  async (req, res) => {
    try {
      const { menuItems } = req.body;
      
      if (!Array.isArray(menuItems)) {
        return res.status(400).json({ error: 'menuItems must be an array' });
      }

      const createdItems = [];
      const errors = [];
      let currentId = await getNextMenuItemId();

      for (let i = 0; i < menuItems.length; i++) {
        const item = menuItems[i];
        
        try {
          if (!item.name || !item.basePrice) {
            errors.push(`Item ${i + 1}: Missing name or basePrice`);
            continue;
          }

          if (isNaN(parseFloat(item.basePrice)) || parseFloat(item.basePrice) <= 0) {
            errors.push(`Item ${i + 1}: Invalid basePrice`);
            continue;
          }

          const newMenuItem = new MenuItem({
            id: currentId,
            name: item.name.trim(),
            basePrice: parseFloat(item.basePrice),
            category: item.category || 'main',
            description: item.description || '',
            image: item.image || '',
            preparationTime: item.preparationTime || 15,
            ingredients: item.ingredients || [],
            tags: item.tags || [],
            isActive: true
          });

          await newMenuItem.save();
          createdItems.push(newMenuItem);
          currentId++;
        } catch (error) {
          errors.push(`Item ${i + 1}: ${error.message}`);
        }
      }

      res.status(201).json({ 
        message: `${createdItems.length} menu items created successfully`,
        items: createdItems,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error('Error bulk uploading menu items:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ======================== DAILY PRICING ROUTES ========================

// Set daily pricing for menu item
router.post('/menu/:id/daily-pricing', authenticateManager, async (req, res) => {
  try {
    const { id } = req.params;
    const { date, price, isAvailable, specialOffer, discount } = req.body;
    
    if (!date || !price) {
      return res.status(400).json({ error: 'Date and price are required' });
    }

    if (isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      return res.status(400).json({ error: 'Price must be a positive number' });
    }

    // Check if menu item exists
    const menuItem = await MenuItem.findOne({ id: parseInt(id) });
    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    const dailyPricing = await DailyMenuPricing.findOneAndUpdate(
      { date, menuItemId: parseInt(id) },
      {
        price: parseFloat(price),
        isAvailable: isAvailable !== undefined ? isAvailable : true,
        specialOffer: specialOffer || '',
        discount: discount || 0,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );

    res.json(dailyPricing);
  } catch (error) {
    console.error('Error setting daily pricing:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get daily pricing for a specific date
router.get('/daily-pricing/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const dailyPricing = await DailyMenuPricing.find({ date }).sort({ menuItemId: 1 });
    res.json(dailyPricing);
  } catch (error) {
    console.error('Error fetching daily pricing:', error);
    res.status(500).json({ error: error.message });
  }
});

// ======================== TABLE MANAGEMENT ROUTES ========================

// Get all tables
router.get('/tables', async (req, res) => {
  try {
    const tables = await Table.find({}).sort({ tableId: 1 });

    // Convert to the format expected by frontend
    const tablesObject = {};
    tables.forEach(table => {
      tablesObject[table.tableId] = {
        id: table.tableId,
        status: table.status,
        orders: Object.fromEntries(table.orders),
        total: table.total,
        orderTime: table.orderTime,
        billTime: table.billTime,
        payTime: table.payTime,
        customerName: table.customerName,
        customerPhone: table.customerPhone,
        notes: table.notes
      };
    });

    res.json(tablesObject);
  } catch (error) {
    console.error('Error fetching tables:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get available tables
router.get('/tables/available', async (req, res) => {
  try {
    const availableTables = await getAvailableTables();
    res.json(availableTables);
  } catch (error) {
    console.error('Error fetching available tables:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get occupied tables
router.get('/tables/occupied', async (req, res) => {
  try {
    const occupiedTables = await getOccupiedTables();
    res.json(occupiedTables);
  } catch (error) {
    console.error('Error fetching occupied tables:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add new table
router.post('/tables', authenticateManager, async (req, res) => {
  try {
    const { tableId, customTableId, capacity, location } = req.body;
    
    const newTableId = customTableId || tableId || await getNextTableId();
    
    if (isNaN(parseInt(newTableId)) || parseInt(newTableId) <= 0) {
      return res.status(400).json({ error: 'Invalid table ID' });
    }

    // Check if table already exists
    const existingTable = await Table.findOne({ tableId: newTableId });
    if (existingTable) {
      return res.status(400).json({ error: 'Table with this ID already exists' });
    }

    const newTable = new Table({
      tableId: newTableId,
      status: 'available',
      capacity: capacity || 4,
      location: location || '',
      orders: new Map(),
      total: 0,
      orderTime: null,
      billTime: null,
      payTime: null
    });

    await newTable.save();
    res.status(201).json({
      id: newTable.tableId,
      status: newTable.status,
      capacity: newTable.capacity,
      location: newTable.location,
      orders: {},
      total: newTable.total,
      orderTime: newTable.orderTime,
      billTime: newTable.billTime,
      payTime: newTable.payTime
    });
  } catch (error) {
    console.error('Error creating table:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update table
router.put('/tables/:tableId', async (req, res) => {
  try {
    const { tableId } = req.params;
    const updates = { ...req.body };

    if (isNaN(parseInt(tableId))) {
      return res.status(400).json({ error: 'Invalid table ID' });
    }

    // Get current table to validate status transition
    const currentTable = await Table.findOne({ tableId: parseInt(tableId) });
    if (!currentTable) {
      return res.status(404).json({ error: 'Table not found' });
    }

    // Validate status transition if status is being updated
    if (updates.status && !isValidStatusTransition(currentTable.status, updates.status)) {
      return res.status(400).json({ 
        error: `Invalid status transition from ${currentTable.status} to ${updates.status}` 
      });
    }

    // Convert orders object to Map if it exists
    if (updates.orders) {
      updates.orders = new Map(Object.entries(updates.orders));
    }

    // Add timestamps based on status changes
    if (updates.status) {
      const currentTime = getCurrentTime();
      switch (updates.status) {
        case 'occupied':
          if (!currentTable.orderTime) updates.orderTime = currentTime;
          break;
        case 'billed':
          updates.billTime = currentTime;
          break;
        case 'paid':
          updates.payTime = currentTime;
          break;
        case 'available':
          // Reset times when table becomes available
          updates.orderTime = null;
          updates.billTime = null;
          updates.payTime = null;
          updates.customerName = '';
          updates.customerPhone = '';
          updates.notes = '';
          break;
      }
    }

    updates.updatedAt = new Date();

    const updatedTable = await Table.findOneAndUpdate(
      { tableId: parseInt(tableId) },
      updates,
      { new: true }
    );

    res.json({
      id: updatedTable.tableId,
      status: updatedTable.status,
      capacity: updatedTable.capacity,
      location: updatedTable.location,
      orders: Object.fromEntries(updatedTable.orders),
      total: updatedTable.total,
      orderTime: updatedTable.orderTime,
      billTime: updatedTable.billTime,
      payTime: updatedTable.payTime,
      customerName: updatedTable.customerName,
      customerPhone: updatedTable.customerPhone,
      notes: updatedTable.notes
    });
  } catch (error) {
    console.error('Error updating table:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete table
router.delete('/tables/:tableId', authenticateManager, async (req, res) => {
  try {
    const { tableId } = req.params;
    
    if (isNaN(parseInt(tableId))) {
      return res.status(400).json({ error: 'Invalid table ID' });
    }

    const table = await Table.findOne({ tableId: parseInt(tableId) });
    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    // Check if table is currently occupied
    if (['occupied', 'billed'].includes(table.status)) {
      return res.status(400).json({ error: 'Cannot delete occupied table' });
    }

    await Table.deleteOne({ tableId: parseInt(tableId) });
    res.json({ message: 'Table deleted successfully' });
  } catch (error) {
    console.error('Error deleting table:', error);
    res.status(500).json({ error: error.message });
  }
});

// Bulk add tables
router.post('/tables/bulk', 
  authenticateManager,
  validateRequest(['count']),
  async (req, res) => {
    try {
      const { count, startId, capacity, location } = req.body;
      
      if (isNaN(parseInt(count)) || parseInt(count) <= 0) {
        return res.status(400).json({ error: 'Count must be a positive number' });
      }

      const createdTables = [];
      const errors = [];
      let currentId = startId || await getNextTableId();

      for (let i = 0; i < count; i++) {
        try {
          // Check if table already exists
          const existingTable = await Table.findOne({ tableId: currentId });
          if (!existingTable) {
            const newTable = new Table({
              tableId: currentId,
              status: 'available',
              capacity: capacity || 4,
              location: location || '',
              orders: new Map(),
              total: 0,
              orderTime: null,
              billTime: null,
              payTime: null
            });

            await newTable.save();
            createdTables.push({
              id: newTable.tableId,
              status: newTable.status,
              capacity: newTable.capacity,
              location: newTable.location,
              orders: {},
              total: newTable.total
            });
          } else {
            errors.push(`Table ${currentId} already exists`);
          }
        } catch (error) {
          errors.push(`Table ${currentId}: ${error.message}`);
        }
        currentId++;
      }

      res.status(201).json({ 
        message: `${createdTables.length} tables created successfully`,
        tables: createdTables,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error('Error bulk creating tables:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ======================== ORDER MANAGEMENT ROUTES ========================

// Complete order (when table is cleared/paid)
router.post('/complete-order', validateRequest(['tableId', 'orderData']), async (req, res) => {
  try {
    const { tableId, orderData } = req.body;
    
    if (isNaN(parseInt(tableId))) {
      return res.status(400).json({ error: 'Invalid table ID' });
    }

    // Validate order data
    if (!orderData.total || !orderData.orders) {
      return res.status(400).json({ error: 'Invalid order data' });
    }

    // Update daily stats
    await updateDailyStats({
      tableId: parseInt(tableId),
      total: orderData.total,
      orders: orderData.orders,
      orderTime: orderData.orderTime,
      billTime: orderData.billTime,
      payTime: getCurrentTime(),
      customerName: orderData.customerName || '',
      customerPhone: orderData.customerPhone || '',
      paymentMethod: orderData.paymentMethod || 'cash'
    });

    // Clear the table
    await Table.findOneAndUpdate(
      { tableId: parseInt(tableId) },
      {
        status: 'available',
        orders: new Map(),
        total: 0,
        orderTime: null,
        billTime: null,
        payTime: null,
        customerName: '',
        customerPhone: '',
        notes: '',
        updatedAt: new Date()
      }
    );

    res.json({ success: true, message: 'Order completed successfully' });
  } catch (error) {
    console.error('Error completing order:', error);
    res.status(500).json({ error: error.message });
  }
});

// ======================== STATISTICS ROUTES ========================

// Get current day stats
router.get('/stats', async (req, res) => {
  try {
    const date = getCurrentDate();
    await initializeDailyStats(date);
    
    const stats = await DailyStats.findOne({ date });
    
    if (stats) {
      res.json({
        totalRevenue: stats.totalRevenue,
        totalOrders: stats.totalOrders,
        avgOrderValue: stats.avgOrderValue,
        popularItems: Object.fromEntries(stats.popularItems),
        completedOrders: stats.completedOrders,
        date: stats.date,
        lastUpdated: stats.updatedAt,
        isFinalized: stats.isFinalized
      });
    } else {
      res.json({
        totalRevenue: 0,
        totalOrders: 0,
        avgOrderValue: 0,
        popularItems: {},
        completedOrders: [],
        date,
        lastUpdated: new Date(),
        isFinalized: false
      });
    }
  } catch (error) {
    console.error('Error fetching daily stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get stats for specific date
router.get('/stats/:date', async (req, res) => {
  try {
    const { date } = req.params;
    
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }
    
    const stats = await DailyStats.findOne({ date });
    
    if (stats) {
      res.json({
        totalRevenue: stats.totalRevenue,
        totalOrders: stats.totalOrders,
        avgOrderValue: stats.avgOrderValue,
        popularItems: Object.fromEntries(stats.popularItems),
        completedOrders: stats.completedOrders,
        date: stats.date,
        isFinalized: stats.isFinalized,
        finalizedAt: stats.finalizedAt,
        lastUpdated: stats.updatedAt
      });
    } else {
      res.json({
        totalRevenue: 0,
        totalOrders: 0,
        avgOrderValue: 0,
        popularItems: {},
        completedOrders: [],
        date,
        isFinalized: false,
        lastUpdated: new Date()
      });
    }
  } catch (error) {
    console.error('Error fetching daily stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get historical stats (last N days)
router.get('/stats/history/days/:days', async (req, res) => {
  try {
    const days = parseInt(req.params.days) || 7;
    
    if (days <= 0 || days > 365) {
      return res.status(400).json({ error: 'Days must be between 1 and 365' });
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const dateStrings = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      dateStrings.push(d.toISOString().split('T')[0]);
    }
    
    const stats = await DailyStats.find({
      date: { $in: dateStrings }
    }).sort({ date: 1 });
    
    res.json(stats.map(stat => ({
      date: stat.date,
      totalRevenue: stat.totalRevenue,
      totalOrders: stat.totalOrders,
      avgOrderValue: stat.avgOrderValue,
      popularItems: Object.fromEntries(stat.popularItems),
      isFinalized: stat.isFinalized,
      finalizedAt: stat.finalizedAt
    })));
  } catch (error) {
    console.error('Error fetching historical stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// ======================== AUTHENTICATION ROUTES ========================

// Manager authentication (should be improved for production)
router.post('/auth/manager', validateRequest(['password']), async (req, res) => {
  try {
    const { password } = req.body;
    
    // In production, this should use proper password hashing and database storage
    if (password === process.env.MANAGER_PASSWORD || password === 'admin123') {
      res.json({ 
        success: true, 
        token: 'manager_authenticated',
        expiresIn: '24h' // Should implement proper JWT tokens
      });
    } else {
      res.status(401).json({ success: false, message: 'Invalid password' });
    }
  } catch (error) {
    console.error('Error in manager auth:', error);
    res.status(500).json({ error: error.message });
  }
});

// ======================== SYSTEM MANAGEMENT ROUTES ========================

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Get system info
router.get('/system/info', authenticateManager, async (req, res) => {
  try {
    const menuCount = await MenuItem.countDocuments({});
    const activeMenuCount = await MenuItem.countDocuments({ isActive: true });
    const tableCount = await Table.countDocuments({});
    const availableTableCount = await Table.countDocuments({ status: 'available' });
    const occupiedTableCount = await Table.countDocuments({ status: { $in: ['occupied', 'billed'] } });

    res.json({
      menu: {
        total: menuCount,
        active: activeMenuCount,
        inactive: menuCount - activeMenuCount
      },
      tables: {
        total: tableCount,
        available: availableTableCount,
        occupied: occupiedTableCount
      },
      date: getCurrentDate(),
      time: getCurrentTime()
    });
  } catch (error) {
    console.error('Error fetching system info:', error);
    res.status(500).json({ error: error.message });
  }
});

// ======================== AUTOMATED TASKS ========================

// Helper function to get previous date
const getPreviousDate = (date) => {
  const prevDate = new Date(date);
  prevDate.setDate(prevDate.getDate() - 1);
  return prevDate.toISOString().split('T')[0];
};

// Finalize previous day stats
const finalizePreviousDayStats = async (previousDate) => {
  try {
    console.log(`Finalizing stats for ${previousDate}`);
    
    const stats = await DailyStats.findOne({ date: previousDate });
    
    if (stats && stats.completedOrders.length > 0 && !stats.isFinalized) {
      // Recalculate final stats
      const popularItems = await calculatePopularItems(stats.completedOrders, previousDate);
      
      await DailyStats.findOneAndUpdate(
        { date: previousDate },
        {
          popularItems,
          isFinalized: true,
          finalizedAt: new Date(),
          updatedAt: new Date()
        }
      );
      
      console.log(`Finalized stats for ${previousDate}: Revenue: ₹${stats.totalRevenue}, Orders: ${stats.totalOrders}`);
    }
  } catch (error) {
    console.error(`Error finalizing stats for ${previousDate}:`, error);
  }
};

// Perform daily reset
const performDailyReset = async () => {
  try {
    const currentDate = getCurrentDate();
    const previousDate = getPreviousDate(currentDate);
    
    console.log(`Performing daily reset for ${currentDate}`);
    
    // Finalize previous day and initialize current day
    await finalizePreviousDayStats(previousDate);
    await initializeDailyStats(currentDate);
    
    console.log('Daily reset completed successfully');
  } catch (error) {
    console.error('Error during daily reset:', error);
  }
};

// Schedule daily reset at midnight
cron.schedule('0 0 * * *', performDailyReset, {
  timezone: "Asia/Kolkata" // Adjust timezone as needed
});

// Manual trigger for daily reset (for testing)
router.post('/system/daily-reset', authenticateManager, async (req, res) => {
  try {
    await performDailyReset();
    res.json({ success: true, message: 'Daily reset completed successfully' });
  } catch (error) {
    console.error('Error in manual daily reset:', error);
    res.status(500).json({ error: error.message });
  }
});

// Initialize server
const initializeServer = async () => {
  try {
    const currentDate = getCurrentDate();
    await initializeDailyStats(currentDate);
    console.log('Server initialized successfully');
  } catch (error) {
    console.error('Error initializing server:', error);
  }
};

// Initialize when module is loaded
initializeServer();

module.exports = router;