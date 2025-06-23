const { MenuItem, Table, DailyStats } = require('../models/Hotel');

// Get current date in YYYY-MM-DD format
const getCurrentDate = () => {
  return new Date().toISOString().split('T')[0];
};

// Initialize tables for a specific date
const initializeTables = async () => {
  try {
    const existingTables = await Table.find({});
    if (existingTables.length === 0) {
      // Create 40 tables (static, not per date)
      const tablesToCreate = [];
      for (let i = 1; i <= 40; i++) {
        tablesToCreate.push({
          tableId: i,
          status: 'available',
          orders: new Map(),
          total: 0,
          orderTime: null,
          billTime: null,
          payTime: null
        });
      }
      await Table.insertMany(tablesToCreate);
      console.log(`Initialized ${tablesToCreate.length} static tables`);
    }
  } catch (error) {
    console.error('Error initializing tables:', error);
    throw error;
  }
};
  
// Initialize daily stats for a specific date
const initializeDailyStats = async (date) => {
  try {
    const existingStats = await DailyStats.findOne({ date });
    
    if (!existingStats) {
      await DailyStats.create({
        date,
        totalRevenue: 0,
        totalOrders: 0,
        avgOrderValue: 0,
        popularItems: new Map(),
        completedOrders: []
      });
      console.log(`Initialized daily stats for ${date}`);
    }
  } catch (error) {
    console.error('Error initializing daily stats:', error);
    throw error;
  }
};

// Calculate popular items from completed orders
const calculatePopularItems = (completedOrders, menuItems) => {
  const popularItems = new Map();
  
  completedOrders.forEach(order => {
    if (order.orders && typeof order.orders === 'object') {
      // Handle both Map and regular object
      const orderEntries = order.orders instanceof Map ? 
        Array.from(order.orders.entries()) : 
        Object.entries(order.orders);
      
      orderEntries.forEach(([itemId, quantity]) => {
        const menuItem = menuItems.find(item => item.id === parseInt(itemId));
        if (menuItem) {
          const current = popularItems.get(menuItem.name) || { quantity: 0, revenue: 0 };
          current.quantity += quantity;
          current.revenue += quantity * menuItem.price;
          popularItems.set(menuItem.name, current);
        }
      });
    }
  });
  
  return popularItems;
};

// Initialize menu items
const initializeMenuItems = async () => {
  try {
    const existingCount = await MenuItem.countDocuments();
    
    if (existingCount === 0) {
      const defaultMenuItems = [
        { id: 1, name: 'Chicken Curry', price: 250, category: 'main' },
        { id: 2, name: 'Mutton Curry', price: 300, category: 'main' },
        { id: 3, name: 'Fish Curry', price: 280, category: 'main' },
        { id: 4, name: 'Vegetable Curry', price: 180, category: 'main' },
        { id: 5, name: 'Dal Tadka', price: 150, category: 'main' },
        { id: 6, name: 'Chicken Biryani', price: 320, category: 'rice' },
        { id: 7, name: 'Mutton Biryani', price: 380, category: 'rice' },
        { id: 8, name: 'Vegetable Biryani', price: 220, category: 'rice' },
        { id: 9, name: 'Jeera Rice', price: 120, category: 'rice' },
        { id: 10, name: 'Plain Rice', price: 80, category: 'rice' },
        { id: 11, name: 'Roti', price: 25, category: 'bread' },
        { id: 12, name: 'Naan', price: 35, category: 'bread' },
        { id: 13, name: 'Paratha', price: 45, category: 'bread' },
        { id: 14, name: 'Lassi', price: 60, category: 'drinks' },
        { id: 15, name: 'Tea', price: 20, category: 'drinks' },
        { id: 16, name: 'Coffee', price: 25, category: 'drinks' },
        { id: 17, name: 'Cold Drink', price: 40, category: 'drinks' },
        { id: 18, name: 'Ice Cream', price: 80, category: 'dessert' },
        { id: 19, name: 'Gulab Jamun', price: 60, category: 'dessert' },
        { id: 20, name: 'Rasgulla', price: 50, category: 'dessert' },
        { id: 21, name: 'Rasgulla', price: 50, category: 'dessert' },
      ];
      
      await MenuItem.insertMany(defaultMenuItems);
      console.log('Default menu items initialized');
    }
  } catch (error) {
    console.error('Error initializing menu items:', error);
    throw error;
  }
};

module.exports = {
  getCurrentDate,
  initializeTables,
  initializeDailyStats,
  calculatePopularItems,
  initializeMenuItems
};