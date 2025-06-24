const { MenuItem, DailyMenuPricing, Table, DailyStats } = require('../models/Hotel');

// Get current date in YYYY-MM-DD format
const getCurrentDate = () => {
  return new Date().toISOString().split('T')[0];
};

// Get current time in HH:MM format
const getCurrentTime = () => {
  return new Date().toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

// Initialize daily stats for a specific date
const initializeDailyStats = async (date = null) => {
  try {
    const targetDate = date || getCurrentDate();
    const existingStats = await DailyStats.findOne({ date: targetDate });
    
    if (!existingStats) {
      const newStats = await DailyStats.create({
        date: targetDate,
        totalRevenue: 0,
        totalOrders: 0,
        avgOrderValue: 0,
        popularItems: new Map(),
        completedOrders: [],
        isFinalized: false
      });
      console.log(`Initialized daily stats for ${targetDate}`);
      return newStats;
    }
    
    return existingStats;
  } catch (error) {
    console.error('Error initializing daily stats:', error);
    throw error;
  }
};

// Calculate popular items from completed orders (FIXED VERSION)
const calculatePopularItems = async (completedOrders, date = null) => {
  try {
    const targetDate = date || getCurrentDate();
    const popularItems = new Map();
    
    // Get menu items and daily pricing for accurate price calculation
    const menuItems = await MenuItem.find({ isActive: true }).lean();
    const dailyPricing = await DailyMenuPricing.find({ date: targetDate }).lean();
    
    // Create pricing lookup map
    const pricingMap = new Map();
    dailyPricing.forEach(pricing => {
      pricingMap.set(pricing.menuItemId, pricing.price);
    });
    
    // Create menu lookup map
    const menuMap = new Map();
    menuItems.forEach(item => {
      menuMap.set(item.id, item);
    });
    
    completedOrders.forEach(order => {
      if (order.orders && typeof order.orders === 'object') {
        // Handle both Map and regular object
        const orderEntries = order.orders instanceof Map ? 
          Array.from(order.orders.entries()) : 
          Object.entries(order.orders);
        
        orderEntries.forEach(([itemId, quantity]) => {
          const menuItem = menuMap.get(parseInt(itemId));
          if (menuItem) {
            // Use daily pricing if available, otherwise use base price
            const itemPrice = pricingMap.get(menuItem.id) || menuItem.basePrice;
            
            const current = popularItems.get(menuItem.name) || { 
              quantity: 0, 
              revenue: 0,
              itemId: menuItem.id,
              category: menuItem.category
            };
            
            current.quantity += quantity;
            current.revenue += quantity * itemPrice;
            popularItems.set(menuItem.name, current);
          }
        });
      }
    });
    
    return popularItems;
  } catch (error) {
    console.error('Error calculating popular items:', error);
    throw error;
  }
};

// Get next available menu item ID
const getNextMenuItemId = async () => {
  try {
    const lastItem = await MenuItem.findOne().sort({ id: -1 }).lean();
    return lastItem ? lastItem.id + 1 : 1;
  } catch (error) {
    console.error('Error getting next menu item ID:', error);
    throw error;
  }
};

// Get next available table ID
const getNextTableId = async () => {
  try {
    const lastTable = await Table.findOne().sort({ tableId: -1 }).lean();
    return lastTable ? lastTable.tableId + 1 : 1;
  } catch (error) {
    console.error('Error getting next table ID:', error);
    throw error;
  }
};

// Get menu items with current day pricing
const getMenuWithDailyPricing = async (date = null) => {
  try {
    const targetDate = date || getCurrentDate();
    const menuItems = await MenuItem.find({ isActive: true }).sort({ id: 1 }).lean();
    const dailyPricing = await DailyMenuPricing.find({ date: targetDate }).lean();
    
    // Create a map for quick lookup
    const pricingMap = new Map();
    dailyPricing.forEach(pricing => {
      pricingMap.set(pricing.menuItemId, pricing);
    });
    
    // Merge menu items with daily pricing
    const menuWithPricing = menuItems.map(item => {
      const pricing = pricingMap.get(item.id);
      return {
        id: item.id,
        name: item.name,
        basePrice: item.basePrice,
        price: pricing ? pricing.price : item.basePrice,
        category: item.category,
        description: item.description,
        image: item.image,
        isActive: item.isActive,
        isAvailable: pricing ? pricing.isAvailable : item.isAvailable,
        preparationTime: item.preparationTime,
        ingredients: item.ingredients,
        tags: item.tags,
        specialOffer: pricing ? pricing.specialOffer : '',
        discount: pricing ? pricing.discount : 0,
        hasDailyPricing: !!pricing
      };
    });
    
    return menuWithPricing;
  } catch (error) {
    console.error('Error getting menu with daily pricing:', error);
    throw error;
  }
};

// Update daily stats after order completion
const updateDailyStats = async (orderData, date = null) => {
  try {
    const targetDate = date || getCurrentDate();
    await initializeDailyStats(targetDate);
    
    const stats = await DailyStats.findOne({ date: targetDate });
    if (!stats) throw new Error('Failed to initialize daily stats');
    
    // Add completed order
    stats.completedOrders.push({
      ...orderData,
      completedAt: new Date().toISOString()
    });
    
    // Recalculate totals
    const totalRevenue = stats.completedOrders.reduce((sum, order) => sum + order.total, 0);
    const totalOrders = stats.completedOrders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    // Recalculate popular items
    const popularItems = await calculatePopularItems(stats.completedOrders, targetDate);
    
    // Update stats
    stats.totalRevenue = totalRevenue;
    stats.totalOrders = totalOrders;
    stats.avgOrderValue = Math.round(avgOrderValue * 100) / 100; // Round to 2 decimal places
    stats.popularItems = popularItems;
    stats.updatedAt = new Date();
    
    await stats.save();
    return stats;
  } catch (error) {
    console.error('Error updating daily stats:', error);
    throw error;
  }
};

// Get available tables
const getAvailableTables = async () => {
  try {
    return await Table.find({ 
      status: { $in: ['available'] } 
    }).sort({ tableId: 1 }).lean();
  } catch (error) {
    console.error('Error getting available tables:', error);
    throw error;
  }
};

// Get occupied tables
const getOccupiedTables = async () => {
  try {
    return await Table.find({ 
      status: { $in: ['occupied', 'billed'] } 
    }).sort({ tableId: 1 }).lean();
  } catch (error) {
    console.error('Error getting occupied tables:', error);
    throw error;
  }
};

// Format currency
const formatCurrency = (amount, currency = '₹') => {
  return `${currency}${amount.toFixed(2)}`;
};

// Validate table status transition
const isValidStatusTransition = (currentStatus, newStatus) => {
  const validTransitions = {
    'available': ['occupied', 'reserved'],
    'reserved': ['occupied', 'available'],
    'occupied': ['billed', 'available'],
    'billed': ['paid', 'occupied'],
    'paid': ['available']
  };
  
  return validTransitions[currentStatus]?.includes(newStatus) || false;
};


// Add this function before module.exports

const initializeTables = async () => {
  const count = await Table.countDocuments();
  if (count === 0) {
    // Create 5 default tables as an example
    for (let i = 1; i <= 5; i++) {
      await Table.create({
        tableId: i,
        status: 'available',
        capacity: 4,
        location: `Table ${i}`,
        orders: new Map(),
        total: 0,
        orderTime: null,
        billTime: null,
        payTime: null,
        customerName: '',
        customerPhone: '',
        notes: '',
        updatedAt: new Date()
      });
    }
    console.log('Default tables created');
  } else {
    console.log(`Found ${count} existing tables`);
  }
};

module.exports = {
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
};