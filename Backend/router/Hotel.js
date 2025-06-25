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
  isValidStatusTransition,
  initializeTables
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

// Middleware for manager authentication
const authenticateManager = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token !== 'manager_authenticated') {
    return res.status(401).json({ error: 'Unauthorized access' });
  }
  next();
};

// Initialize menu items function
const initializeMenuItems = async () => {
  try {
    console.log('Initializing menu items...');
    const existingItems = await MenuItem.countDocuments({});
    if (existingItems > 0) {
      console.log(`Found ${existingItems} existing menu items`);
      return;
    }
    const defaultMenuItems = [
      {
        id: 1,
        name: 'Chicken Biryani',
        basePrice: 180,
        category: 'main',
        description: 'Aromatic basmati rice with tender chicken',
        preparationTime: 25,
        ingredients: ['Chicken', 'Basmati Rice', 'Spices', 'Yogurt'],
        tags: ['spicy', 'popular'],
        isActive: true
      },
      {
        id: 2,
        name: 'Butter Chicken',
        basePrice: 220,
        category: 'main',
        description: 'Creamy tomato-based chicken curry',
        preparationTime: 20,
        ingredients: ['Chicken', 'Tomato', 'Cream', 'Butter'],
        tags: ['creamy', 'mild'],
        isActive: true
      },
      {
        id: 3,
        name: 'Paneer Tikka',
        basePrice: 160,
        category: 'appetizer',
        description: 'Grilled cottage cheese with spices',
        preparationTime: 15,
        ingredients: ['Paneer', 'Spices', 'Yogurt'],
        tags: ['vegetarian', 'grilled'],
        isActive: true
      },
      {
        id: 4,
        name: 'Dal Tadka',
        basePrice: 120,
        category: 'main',
        description: 'Yellow lentils with tempering',
        preparationTime: 15,
        ingredients: ['Lentils', 'Spices', 'Ghee'],
        tags: ['vegetarian', 'healthy'],
        isActive: true
      },
      {
        id: 5,
        name: 'Masala Chai',
        basePrice: 25,
        category: 'beverage',
        description: 'Traditional Indian spiced tea',
        preparationTime: 5,
        ingredients: ['Tea', 'Milk', 'Spices'],
        tags: ['hot', 'traditional'],
        isActive: true
      }
    ];
    for (const item of defaultMenuItems) {
      const menuItem = new MenuItem(item);
      await menuItem.save();
    }
    console.log('Default menu items created successfully');
  } catch (error) {
    console.error('Error initializing menu items:', error);
  }
};

// ======================== MENU MANAGEMENT ROUTES ========================

// Get active menu with daily pricing (NO AUTHENTICATION REQUIRED)
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

// Get specific menu item by ID (NO AUTHENTICATION REQUIRED)
router.get('/menu/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (isNaN(parseInt(id))) {
      return res.status(400).json({ error: 'Invalid menu item ID' });
    }

    const menuItem = await MenuItem.findOne({ id: parseInt(id), isActive: true });
    
    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    const date = req.query.date || getCurrentDate();
    const dailyPricing = await DailyMenuPricing.findOne({ 
      date, 
      menuItemId: parseInt(id) 
    });

    const response = {
      id: menuItem.id,
      name: menuItem.name,
      basePrice: menuItem.basePrice,
      currentPrice: dailyPricing ? dailyPricing.price : menuItem.basePrice,
      category: menuItem.category,
      description: menuItem.description,
      image: menuItem.image,
      preparationTime: menuItem.preparationTime,
      ingredients: menuItem.ingredients,
      tags: menuItem.tags,
      isAvailable: dailyPricing ? dailyPricing.isAvailable : true,
      specialOffer: dailyPricing ? dailyPricing.specialOffer : '',
      discount: dailyPricing ? dailyPricing.discount : 0
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching menu item:', error);
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
    
    if (isNaN(parseInt(id))) {
      return res.status(400).json({ error: 'Invalid menu item ID' });
    }

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

// Get all tables (NO AUTHENTICATION REQUIRED for public viewing)
router.get('/tables', async (req, res) => {
  try {
    const tables = await Table.find({}).sort({ tableId: 1 });

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
// ...existing code...

// Update table
// Remove manager authentication from table update route

// Update table (no manager authentication required)
router.put('/tables/:tableId', async (req, res) => {
  try {
    const { tableId } = req.params;
    const updates = { ...req.body };

    if (isNaN(parseInt(tableId))) {
      return res.status(400).json({ error: 'Invalid table ID' });
    }

    const currentTable = await Table.findOne({ tableId: parseInt(tableId) });
    if (!currentTable) {
      return res.status(404).json({ error: 'Table not found' });
    }

    // Normalize & convert orders object to Map if needed
    if (updates.orders && typeof updates.orders === 'object') {
      const normalizedOrders = {};
      for (const [key, value] of Object.entries(updates.orders)) {
        const numericQty = Number(value);
        if (isNaN(numericQty) || numericQty < 0) {
          return res.status(400).json({ error: `Invalid quantity for item ID ${key}` });
        }
        normalizedOrders[key] = numericQty;
      }
      updates.orders = new Map(Object.entries(normalizedOrders));
    }

    // Validate status transition
  if (
  updates.status &&
  updates.status !== currentTable.status &&
  !isValidStatusTransition(currentTable.status, updates.status)
) {
  return res.status(400).json({
    error: `Invalid status transition from ${currentTable.status} to ${updates.status}`
  });
}

    // Timestamp management
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
          updates.orderTime = null;
          updates.billTime = null;
          updates.payTime = null;
          updates.customerName = '';
          updates.customerPhone = '';
          updates.notes = '';
          break;
      }
    }

    // Calculate total if orders updated
    if (updates.orders) {
      let orderTotal = 0;
      for (const [itemId, qty] of updates.orders.entries()) {
        const menuItem = await MenuItem.findOne({ id: parseInt(itemId) });
        if (!menuItem) {
          return res.status(400).json({ error: `Menu item with ID ${itemId} not found` });
        }
        orderTotal += (menuItem.basePrice || 0) * qty;
      }
      updates.total = orderTotal;
    }

    updates.updatedAt = new Date();

    const updatedTable = await Table.findOneAndUpdate(
      { tableId: parseInt(tableId) },
      updates,
      { new: true }
    );

    if (!updatedTable) {
      return res.status(404).json({ error: 'Table not found after update' });
    }

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
    res.status(500).json({ error: `Failed to update table: ${error.message}` });
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

// ======================== ORDER MANAGEMENT ROUTES ========================

// Complete order (when table is cleared/paid)
router.post('/complete-order', validateRequest(['tableId', 'orderData']), async (req, res) => {
  try {
    const { tableId, orderData } = req.body;
    
    if (isNaN(parseInt(tableId))) {
      return res.status(400).json({ error: 'Invalid table ID' });
    }

    if (!orderData.total || !orderData.orders) {
      return res.status(400).json({ error: 'Invalid order data' });
    }

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

// ======================== AUTHENTICATION ROUTES ========================

// Manager authentication
router.post('/auth/manager', validateRequest(['password']), async (req, res) => {
  try {
    const { password } = req.body;
    
    if (password === process.env.MANAGER_PASSWORD || password === 'admin123') {
      res.json({ 
        success: true, 
        token: 'manager_authenticated',
        expiresIn: '24h'
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

// ======================== AUTOMATED TASKS ========================

// Initialize server
const initializeServer = async () => {
  try {
    const currentDate = getCurrentDate();
    const currentTime = getCurrentTime();
    console.log(`Initializing server at ${currentDate} ${currentTime} IST`);
    await initializeDailyStats(currentDate);
    await initializeMenuItems();
    await initializeTables();
    console.log('Server initialized successfully');
  } catch (error) {
    console.error('Error initializing server:', error);
  }
};

// Initialize when module is loaded
initializeServer();

// Schedule daily stats initialization at midnight
cron.schedule('0 0 * * *', async () => {
  const date = getCurrentDate();
  console.log(`Running daily stats initialization for ${date}`);
  await initializeDailyStats(date);
});

module.exports = router;
module.exports.initializeMenuItems = initializeMenuItems;