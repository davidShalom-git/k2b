const express = require('express');
const router = express.Router();
const { DailyStats, Table, MenuItem } = require('../models/Hotel');
const { 
  getCurrentDate, 
  initializeTablesForDate, 
  initializeDailyStats, 
  calculatePopularItems,
  initializeMenuItems 
} = require('../utils/hotelUtils');

const cron = require('node-cron');

router.get('/menu', async (req, res) => {
  try {
    const menuItems = await MenuItem.find({ isActive: true }).sort({ id: 1 });
    res.json(menuItems);
  } catch (error) {
    console.error('Error fetching menu:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get tables for current date
router.get('/tables', async (req, res) => {
  try {
    // No date logic, just fetch all tables
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
        payTime: table.payTime
      };
    });

    res.json(tablesObject);
  } catch (error) {
    console.error('Error fetching tables:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update table
router.put('/tables/:tableId', async (req, res) => {
  try {
    const { tableId } = req.params;
    const updates = req.body;

    // Convert orders object to Map if it exists
    if (updates.orders) {
      updates.orders = new Map(Object.entries(updates.orders));
    }

    const updatedTable = await Table.findOneAndUpdate(
      { tableId: parseInt(tableId) },
      { ...updates, updatedAt: new Date() },
      { new: true, upsert: true }
    );

    res.json({
      id: updatedTable.tableId,
      status: updatedTable.status,
      orders: Object.fromEntries(updatedTable.orders),
      total: updatedTable.total,
      orderTime: updatedTable.orderTime,
      billTime: updatedTable.billTime,
      payTime: updatedTable.payTime
    });
  } catch (error) {
    console.error('Error updating table:', error);
    res.status(500).json({ error: error.message });
  }
});

// Complete order (when table is cleared)
router.post('/complete-order', async (req, res) => {
  try {
    const { tableId, orderData } = req.body;
    const currentDate = getCurrentDate();

    // Add completed order to daily stats (keep this if you want stats per day)
    await DailyStats.findOneAndUpdate(
      { date: currentDate },
      { 
        $push: { 
          completedOrders: {
            ...orderData,
            completedAt: new Date().toISOString()
          }
        },
        updatedAt: new Date()
      },
      { upsert: true }
    );

    // Clear the table (no date)
    await Table.findOneAndUpdate(
      { tableId: parseInt(tableId) },
      {
        status: 'available',
        orders: new Map(),
        total: 0,
        orderTime: null,
        billTime: null,
        payTime: null,
        updatedAt: new Date()
      }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error completing order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Function to finalize previous day's stats
const finalizePreviousDayStats = async (previousDate) => {
  try {
    console.log(`Finalizing stats for ${previousDate}`);
    
    let stats = await DailyStats.findOne({ date: previousDate });
    
    if (stats && stats.completedOrders.length > 0) {
      const menuItems = await MenuItem.find({ isActive: true });
      
      // Recalculate final stats
      const totalRevenue = stats.completedOrders.reduce((sum, order) => sum + order.total, 0);
      const totalOrders = stats.completedOrders.length;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      const popularItems = calculatePopularItems(stats.completedOrders, menuItems);
      
      // Mark as finalized and update final stats
      await DailyStats.findOneAndUpdate(
        { date: previousDate },
        {
          totalRevenue,
          totalOrders,
          avgOrderValue,
          popularItems,
          isFinalized: true,
          finalizedAt: new Date(),
          updatedAt: new Date()
        }
      );
      
      console.log(`Finalized stats for ${previousDate}: Revenue: ₹${totalRevenue}, Orders: ${totalOrders}`);
    }
  } catch (error) {
    console.error(`Error finalizing stats for ${previousDate}:`, error);
  }
};

// Get historical stats (last 7 days)
router.get('/stats/history/week', async (req, res) => {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    
    const dateStrings = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      dateStrings.push(d.toISOString().split('T')[0]);
    }
    
    const stats = await DailyStats.find({
      date: { $in: dateStrings }
    }).sort({ date: 1 });
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching weekly stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get historical stats (all past finalized days)
router.get('/stats/history', async (req, res) => {
  try {
    const currentDate = getCurrentDate();
    
    const historicalStats = await DailyStats.find({
      date: { $lt: currentDate },
      isFinalized: true
    }).sort({ date: -1 }).limit(30); // Last 30 days
    
    res.json(historicalStats.map(stat => ({
      date: stat.date,
      totalRevenue: stat.totalRevenue,
      totalOrders: stat.totalOrders,
      avgOrderValue: stat.avgOrderValue,
      popularItems: Object.fromEntries(stat.popularItems),
      finalizedAt: stat.finalizedAt
    })));
  } catch (error) {
    console.error('Error fetching historical stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Base route for current day stats
router.get('/stats', async (req, res) => {
  try {
    const date = getCurrentDate();
    await initializeDailyStats(date);
    
    let stats = await DailyStats.findOne({ date });
    const menuItems = await MenuItem.find({ isActive: true });
    
    if (stats) {
      // Recalculate stats based on completed orders (real-time calculation)
      const totalRevenue = stats.completedOrders.reduce((sum, order) => sum + order.total, 0);
      const totalOrders = stats.completedOrders.length;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      const popularItems = calculatePopularItems(stats.completedOrders, menuItems);
      
      // Update the stats (but don't mark as finalized until day ends)
      stats = await DailyStats.findOneAndUpdate(
        { date },
        {
          totalRevenue,
          totalOrders,
          avgOrderValue,
          popularItems,
          updatedAt: new Date()
        },
        { new: true }
      );
      
      res.json({
        totalRevenue: stats.totalRevenue,
        totalOrders: stats.totalOrders,
        avgOrderValue: stats.avgOrderValue,
        popularItems: Object.fromEntries(stats.popularItems),
        completedOrders: stats.completedOrders,
        date: stats.date,
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
        lastUpdated: new Date()
      });
    }
  } catch (error) {
    console.error('Error fetching daily stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Route for specific date stats
router.get('/stats/:date', async (req, res) => {
  try {
    const date = req.params.date;
    
    let stats = await DailyStats.findOne({ date });
    const menuItems = await MenuItem.find({ isActive: true });
    
    if (stats) {
      // For past dates, use finalized data if available
      if (stats.isFinalized) {
        res.json({
          totalRevenue: stats.totalRevenue,
          totalOrders: stats.totalOrders,
          avgOrderValue: stats.avgOrderValue,
          popularItems: Object.fromEntries(stats.popularItems),
          completedOrders: stats.completedOrders,
          date: stats.date,
          isFinalized: true,
          finalizedAt: stats.finalizedAt
        });
      } else {
        // Recalculate for current day or non-finalized days
        const totalRevenue = stats.completedOrders.reduce((sum, order) => sum + order.total, 0);
        const totalOrders = stats.completedOrders.length;
        const avgOrderValue = totalOrders > 0 ? Math.round((totalRevenue / totalOrders) * 100) / 100 : 0;
        const popularItems = calculatePopularItems(stats.completedOrders, menuItems);
        
        res.json({
          totalRevenue,
          totalOrders,
          avgOrderValue,
          popularItems: Object.fromEntries(popularItems),
          completedOrders: stats.completedOrders,
          date: stats.date,
          isFinalized: false
        });
      }
    } else {
      res.json({
        totalRevenue: 0,
        totalOrders: 0,
        avgOrderValue: 0,
        popularItems: {},
        completedOrders: [],
        date,
        isFinalized: false
      });
    }
  } catch (error) {
    console.error('Error fetching daily stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Manager authentication
router.post('/auth/manager', async (req, res) => {
  try {
    const { password } = req.body;
    
    if (password === 'admin123') {
      res.json({ success: true, token: 'manager_authenticated' });
    } else {
      res.status(401).json({ success: false, message: 'Invalid password' });
    }
  } catch (error) {
    console.error('Error in manager auth:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to get previous date
const getPreviousDate = (date) => {
  const prevDate = new Date(date);
  prevDate.setDate(prevDate.getDate() - 1);
  return prevDate.toISOString().split('T')[0];
};

const performDailyReset = async () => {
  try {
    const currentDate = getCurrentDate();
    const previousDate = getPreviousDate(currentDate);
    
    console.log(`Performing daily reset for ${currentDate}`);
    
    // First, finalize previous day's stats
    await finalizePreviousDayStats(previousDate);
    
    // Initialize today's tables and stats
  
    await initializeDailyStats(currentDate);
    
    console.log('Daily reset completed successfully');
  } catch (error) {
    console.error('Error during daily reset:', error);
  }
};

// Schedule daily reset at midnight
cron.schedule('0 0 * * *', performDailyReset);

// Initialize data on server start
const initializeServer = async () => {
  try {
    await initializeMenuItems();
    await performDailyReset();
    console.log('Server initialized successfully');
  } catch (error) {
    console.error('Error initializing server:', error);
  }
};

// Call initialization when the module is loaded
initializeServer();

module.exports = router;