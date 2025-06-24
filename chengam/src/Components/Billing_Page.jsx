import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Minus, DollarSign, Users, Clock, CheckCircle, BarChart3, RefreshCw, Menu, X, LogOut, ArrowLeft, Snowflake, ChefHat, Utensils, CreditCard, Timer, TrendingUp, Edit3, Save, Trash2, AlertCircle, Calendar, Package } from 'lucide-react';

const RestaurantPOS = () => {
  const API_BASE_URL = 'https://k2bhotel.vercel.app/api/hotel';
  
  const [state, setState] = useState({
    menuItems: [],
    tables: {},
    selectedTable: null,
    activeView: 'tables',
    roomType: 'regular',
    dailyStats: { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0, popularItems: {}, completedOrders: [] },
    loading: false,
    error: '',
    isManager: false,
    managerPassword: '',
    showMobileMenu: false,
    // Menu management states
    editingItem: null,
    newItem: { name: '', basePrice: '', category: 'main', description: '', preparationTime: 15 },
    showAddItem: false,
    menuError: '',
    // Daily pricing states
    dailyPricing: {},
    selectedDate: new Date().toISOString().split('T')[0],
    editingDailyPrice: null,
    showDailyPricing: false
  });

  const updateState = useCallback((updates) => setState(prev => ({ ...prev, ...updates })), []);

  // API call function with better error handling
  const apiCall = useCallback(async (endpoint, method = 'GET', body = null) => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        ...(body && { body: JSON.stringify(body) })
      });
      if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
      return response.json();
    } catch (err) {
      throw new Error(err.message);
    }
  }, []);

  // Memoized calculations for performance
  const filteredTables = useMemo(() => {
    return Object.values(state.tables).filter(table => {
      return state.roomType === 'ac' ? table.id > 20 : table.id <= 20;
    });
  }, [state.tables, state.roomType]);

  const activeOrders = useMemo(() => {
    return Object.values(state.tables).filter(table => 
      table.status !== 'available' && Object.keys(table.orders).length > 0
    );
  }, [state.tables]);

  // Get current price for menu item (daily pricing or base price)
  const getCurrentPrice = useCallback((menuItem) => {
    const dailyPrice = state.dailyPricing[menuItem.id];
    return dailyPrice?.price || menuItem.basePrice || menuItem.price;
  }, [state.dailyPricing]);

  // Fetch data
  const fetchAllData = useCallback(async () => {
    if (state.loading) return;
    try {
      updateState({ loading: true, error: '' });
      const [menuItems, tables, dailyStats] = await Promise.all([
        apiCall('/menu'),
        apiCall('/tables'),
        apiCall('/stats')
      ]);
      updateState({ menuItems, tables, dailyStats, loading: false });
    } catch (err) {
      updateState({ error: 'Failed to load data: ' + err.message, loading: false });
    }
  }, [state.loading, apiCall, updateState]);

  // Fetch daily pricing
  const fetchDailyPricing = useCallback(async (date) => {
    try {
      const pricing = await apiCall(`/daily-pricing/${date}`);
      const pricingMap = {};
      pricing.forEach(p => {
        pricingMap[p.menuItemId] = p;
      });
      updateState({ dailyPricing: pricingMap });
    } catch (err) {
      console.error('Failed to fetch daily pricing:', err);
    }
  }, [apiCall, updateState]);

  // Menu management functions
  const addMenuItem = useCallback(async () => {
    if (!state.newItem.name.trim() || !state.newItem.basePrice || parseFloat(state.newItem.basePrice) <= 0) {
      updateState({ menuError: 'Please provide valid item name and base price' });
      return;
    }

    try {
      updateState({ loading: true, menuError: '' });
      const newItem = await apiCall('/menu', 'POST', {
        name: state.newItem.name.trim(),
        basePrice: parseFloat(state.newItem.basePrice),
        category: state.newItem.category,
        description: state.newItem.description,
        preparationTime: parseInt(state.newItem.preparationTime) || 15
      });
      
      updateState({ 
        menuItems: [...state.menuItems, newItem],
        newItem: { name: '', basePrice: '', category: 'main', description: '', preparationTime: 15 },
        showAddItem: false,
        loading: false
      });
    } catch (err) {
      updateState({ menuError: 'Failed to add item: ' + err.message, loading: false });
    }
  }, [state.newItem, apiCall, updateState, state.menuItems]);

  const updateMenuItem = useCallback(async (itemId, updates) => {
    try {
      updateState({ loading: true, menuError: '' });
      const updatedItem = await apiCall(`/menu/${itemId}`, 'PUT', updates);
      
      updateState({
        menuItems: state.menuItems.map(item => 
          item.id === itemId ? updatedItem : item
        ),
        editingItem: null,
        loading: false
      });
    } catch (err) {
      updateState({ menuError: 'Failed to update item: ' + err.message, loading: false });
    }
  }, [apiCall, updateState, state.menuItems]);

  const deleteMenuItem = useCallback(async (itemId) => {
    if (!confirm('Are you sure you want to delete this menu item?')) return;

    try {
      updateState({ loading: true, menuError: '' });
      await apiCall(`/menu/${itemId}`, 'DELETE');
      
      updateState({
        menuItems: state.menuItems.filter(item => item.id !== itemId),
        loading: false
      });
    } catch (err) {
      updateState({ menuError: 'Failed to delete item: ' + err.message, loading: false });
    }
  }, [apiCall, updateState, state.menuItems]);

  // Daily pricing functions
  const setDailyPrice = useCallback(async (itemId, price, isAvailable = true) => {
    try {
      updateState({ loading: true, menuError: '' });
      const dailyPrice = await apiCall(`/menu/${itemId}/daily-pricing`, 'POST', {
        date: state.selectedDate,
        price: parseFloat(price),
        isAvailable
      });
      
      updateState({
        dailyPricing: {
          ...state.dailyPricing,
          [itemId]: dailyPrice
        },
        editingDailyPrice: null,
        loading: false
      });
    } catch (err) {
      updateState({ menuError: 'Failed to set daily price: ' + err.message, loading: false });
    }
  }, [apiCall, updateState, state.selectedDate, state.dailyPricing]);

  // Calculate total
  const calculateTotal = useCallback((orders) => {
    return Object.entries(orders).reduce((sum, [id, qty]) => {
      const item = state.menuItems.find(item => item.id === parseInt(id));
      const price = item ? getCurrentPrice(item) : 0;
      return sum + (price * qty);
    }, 0);
  }, [state.menuItems, getCurrentPrice]);

  // Update table
  const updateTable = useCallback(async (tableId, updates) => {
    try {
      const updatedTable = await apiCall(`/tables/${tableId}`, 'PUT', updates);
      updateState({ tables: { ...state.tables, [tableId]: updatedTable } });
    } catch (err) {
      updateState({ error: 'Failed to update table: ' + err.message });
    }
  }, [apiCall, updateState, state.tables]);

  // Handle table actions
  const handleTableAction = useCallback(async (tableId, action, itemId = null) => {
    const table = state.tables[tableId];
    if (!table) return;

    switch (action) {
      case 'addItem': {
        const newOrders = { ...table.orders, [itemId]: (table.orders[itemId] || 0) + 1 };
        await updateTable(tableId, {
          orders: newOrders,
          total: calculateTotal(newOrders),
          status: table.status === 'available' ? 'occupied' : table.status,
          orderTime: table.status === 'available' ? new Date().toLocaleTimeString() : table.orderTime
        });
        break;
      }
      case 'removeItem': {
        const newOrders = { ...table.orders };
        if (newOrders[itemId] > 0) {
          newOrders[itemId]--;
          if (newOrders[itemId] === 0) delete newOrders[itemId];
        }
        await updateTable(tableId, {
          orders: newOrders,
          total: calculateTotal(newOrders),
          status: Object.keys(newOrders).length === 0 ? 'available' : table.status
        });
        break;
      }
      case 'bill':
        await updateTable(tableId, { status: 'billed', billTime: new Date().toLocaleTimeString() });
        break;
      case 'paid':
        await updateTable(tableId, { status: 'paid', payTime: new Date().toLocaleTimeString() });
        break;
      case 'clear':
        await apiCall('/complete-order', 'POST', { tableId, orderData: table });
        await fetchAllData();
        break;
    }
  }, [state.tables, updateTable, calculateTotal, apiCall, fetchAllData]);

  // Manager login
  const handleManagerLogin = useCallback(async (event) => {
    event.preventDefault();
    try {
      updateState({ loading: true, error: '' });
      const data = await apiCall('/auth/manager', 'POST', { password: state.managerPassword });
      if (data.success) {
        updateState({ isManager: true, activeView: 'manager', managerPassword: '', loading: false });
      } else {
        updateState({ error: 'Invalid password', loading: false });
      }
    } catch (err) {
      updateState({ error: 'Login failed: ' + err.message, loading: false });
    }
  }, [state.managerPassword, apiCall, updateState]);

  useEffect(() => {
    fetchAllData();
    fetchDailyPricing(state.selectedDate);
  }, []);

  useEffect(() => {
    if (state.selectedDate) {
      fetchDailyPricing(state.selectedDate);
    }
  }, [state.selectedDate, fetchDailyPricing]);

  // Table colors with modern design
  const getTableStatus = (status) => {
    const statusConfig = {
      available: {
        bg: 'bg-gradient-to-br from-emerald-50 to-green-100',
        border: 'border-emerald-200',
        text: 'text-emerald-800',
        icon: Users,
        pulse: false
      },
      occupied: {
        bg: 'bg-gradient-to-br from-amber-50 to-yellow-100',
        border: 'border-amber-200',
        text: 'text-amber-800',
        icon: Timer,
        pulse: true
      },
      billed: {
        bg: 'bg-gradient-to-br from-rose-50 to-red-100',
        border: 'border-rose-200',
        text: 'text-rose-800',
        icon: CreditCard,
        pulse: false
      },
      paid: {
        bg: 'bg-gradient-to-br from-blue-50 to-indigo-100',
        border: 'border-blue-200',
        text: 'text-blue-800',
        icon: CheckCircle,
        pulse: false
      }
    };
    return statusConfig[status] || statusConfig.available;
  };

  // Modern Button Component
  const Button = ({ children, onClick, variant = 'primary', disabled = false, className = '', size = 'md' }) => {
    const variants = {
      primary: 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl',
      success: 'bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800 text-white shadow-lg hover:shadow-xl',
      danger: 'bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 text-white shadow-lg hover:shadow-xl',
      warning: 'bg-gradient-to-r from-amber-600 to-orange-700 hover:from-amber-700 hover:to-orange-800 text-white shadow-lg hover:shadow-xl',
      secondary: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-sm hover:shadow-md'
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2',
      lg: 'px-6 py-3 text-lg'
    };
    
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`${sizes[size]} rounded-xl font-medium transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none ${variants[variant]} ${className}`}
      >
        {children}
      </button>
    );
  };

  // Modern Header Component
  const Header = () => (
    <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-gray-200/50 sticky top-0 z-50">
      <div className="px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            {state.selectedTable && (
              <button
                onClick={() => updateState({ selectedTable: null, activeView: 'tables' })}
                className="p-2 hover:bg-gray-100 rounded-xl transition-all duration-200"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl">
                <ChefHat className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                  Restaurant POS
                </h1>
                <p className="text-sm text-gray-500">Modern Point of Sale</p>
              </div>
            </div>
            {state.loading && <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />}
          </div>
          
          <div className="flex gap-3">
            <Button 
              onClick={fetchAllData} 
              disabled={state.loading} 
              variant="secondary"
              className="p-2"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {!state.selectedTable && (
          <nav className="flex gap-2 mt-6">
            {[
              { key: 'tables', label: 'Tables', icon: Users },
              { key: 'orders', label: 'Orders', icon: Utensils },
              { key: 'billing', label: 'Billing', icon: CreditCard },
              { key: state.isManager ? 'manager' : 'manager-login', label: 'Manager', icon: BarChart3 }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => updateState({ activeView: tab.key })}
                className={`px-6 py-3 text-sm rounded-xl font-medium transition-all duration-200 flex items-center gap-2 ${
                  state.activeView === tab.key 
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        )}
      </div>
    </header>
  );

  // Views with modern design
  const ManagerLogin = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-6">
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl p-8 w-full max-w-md border border-white/20">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-700 rounded-xl flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Manager Login</h2>
          <p className="text-gray-600">Access management dashboard</p>
        </div>
        
        {state.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-4">
            {state.error}
          </div>
        )}
        
        <div className="space-y-4">
          <input
            type="password"
            placeholder="Enter manager password"
            value={state.managerPassword}
            onChange={(e) => updateState({ managerPassword: e.target.value })}
            className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            onKeyPress={(e) => e.key === 'Enter' && handleManagerLogin(e)}
          />
          <Button 
            onClick={handleManagerLogin} 
            disabled={state.loading} 
            className="w-full" 
            size="lg"
          >
            {state.loading ? 'Logging in...' : 'Login'}
          </Button>
        </div>
      </div>
    </div>
  );

  const TablesView = () => (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      {/* Room Type Toggle */}
      <div className="flex gap-3 mb-8">
        <button
          onClick={() => updateState({ roomType: 'regular' })}
          className={`px-6 py-3 rounded-xl flex items-center gap-3 font-medium transition-all duration-200 ${
            state.roomType === 'regular' 
              ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg' 
              : 'bg-white hover:bg-gray-50 text-gray-700 shadow-md'
          }`}
        >
          <Users className="w-5 h-5" />
          Regular Tables
        </button>
        <button
          onClick={() => updateState({ roomType: 'ac' })}
          className={`px-6 py-3 rounded-xl flex items-center gap-3 font-medium transition-all duration-200 ${
            state.roomType === 'ac' 
              ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg' 
              : 'bg-white hover:bg-gray-50 text-gray-700 shadow-md'
          }`}
        >
          <Snowflake className="w-5 h-5" />
          AC Room
        </button>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {filteredTables.map(table => {
          const statusConfig = getTableStatus(table.status);
          const StatusIcon = statusConfig.icon;
          
          return (
            <div
              key={table.id}
              onClick={() => updateState({ selectedTable: table.id, activeView: 'menu' })}
              className={`relative p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 transform hover:scale-105 hover:shadow-xl ${statusConfig.bg} ${statusConfig.border} ${statusConfig.text} ${statusConfig.pulse ? 'animate-pulse' : ''}`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg">Table {table.id}</h3>
                  <p className="text-sm opacity-75 capitalize">{table.status}</p>
                </div>
                <div className="p-2 bg-white/50 rounded-lg">
                  <StatusIcon className="w-5 h-5" />
                </div>
              </div>
              
              {table.total > 0 && (
                <div className="bg-white/50 rounded-lg p-3 mb-2">
                  <div className="font-bold text-lg">₹{table.total}</div>
                </div>
              )}
              
              {table.orderTime && (
                <div className="text-xs opacity-70 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {table.orderTime}
                </div>
              )}
              
              {table.status === 'occupied' && (
                <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full animate-ping"></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const MenuView = () => (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Table {state.selectedTable}</h2>
          <p className="text-gray-600">Select items to add to order</p>
        </div>
        
        {/* Current Order Summary */}
        {state.tables[state.selectedTable]?.total > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 mb-6">
            <h3 className="font-bold text-lg mb-4 text-blue-800 flex items-center gap-2">
              <Utensils className="w-5 h-5" />
              Current Order
            </h3>
            <div className="space-y-2 mb-4">
              {Object.entries(state.tables[state.selectedTable].orders).map(([itemId, qty]) => {
                const item = state.menuItems.find(i => i.id === parseInt(itemId));
                const price = item ? getCurrentPrice(item) : 0;
                return item ? (
                  <div key={itemId} className="flex justify-between items-center py-2 px-3 bg-white/50 rounded-lg">
                    <span className="font-medium">{item.name} × {qty}</span>
                    <span className="font-bold text-blue-700">₹{price * qty}</span>
                  </div>
                ) : null;
              })}
            </div>
            <div className="border-t border-blue-200 pt-4">
              <div className="flex justify-between items-center text-xl font-bold text-blue-800">
                <span>Total Amount</span>
                <span>₹{state.tables[state.selectedTable].total}</span>
              </div>
            </div>
          </div>
        )}

        {/* Menu Items */}
        <div className="grid gap-4 mb-8">
          {state.menuItems.map(item => {
            const currentPrice = getCurrentPrice(item);
            const dailyPrice = state.dailyPricing[item.id];
            const isSpecialPrice = dailyPrice && dailyPrice.price !== item.basePrice;
            
            return (
              <div key={item.id} className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300">
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-lg text-gray-800">{item.name}</h4>
                      {isSpecialPrice && (
                        <span className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-2 py-1 rounded-lg text-xs font-medium">
                          Special Price
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold text-green-600">₹{currentPrice}</p>
                      {isSpecialPrice && (
                        <p className="text-lg text-gray-500 line-through">₹{item.basePrice}</p>
                      )}
                    </div>
                    {item.category && (
                      <p className="text-sm text-gray-500 capitalize">{item.category}</p>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="success"
                      onClick={() => handleTableAction(state.selectedTable, 'addItem', item.id)}
                      disabled={['billed', 'paid'].includes(state.tables[state.selectedTable]?.status)}
                      className="p-3 rounded-xl"
                    >
                      <Plus className="w-5 h-5" />
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => handleTableAction(state.selectedTable, 'removeItem', item.id)}
                      disabled={!state.tables[state.selectedTable]?.orders[item.id]}
                      className="p-3 rounded-xl"
                    >
                      <Minus className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          {state.tables[state.selectedTable]?.status === 'occupied' && state.tables[state.selectedTable]?.total > 0 && (
            <Button
              variant="warning"
              onClick={() => handleTableAction(state.selectedTable, 'bill')}
              className="flex-1 py-4 text-lg"
              size="lg"
            >
              <CreditCard className="w-5 h-5 mr-2" />
              Generate Bill
            </Button>
          )}
          {state.tables[state.selectedTable]?.status === 'billed' && (
            <Button
              variant="success"
              onClick={() => handleTableAction(state.selectedTable, 'paid')}
              className="flex-1 py-4 text-lg"
              size="lg"
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              Mark as Paid
            </Button>
          )}
          {state.tables[state.selectedTable]?.status === 'paid' && (
            <Button
              variant="primary"
              onClick={() => handleTableAction(state.selectedTable, 'clear')}
              className="flex-1 py-4 text-lg"
              size="lg"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Clear Table
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  const OrdersView = () => (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
            <Utensils className="w-7 h-7" />
            Active Orders
          </h2>
          <p className="text-gray-600 mt-1">Monitor all active table orders</p>
        </div>

        <div className="grid gap-6">
          {activeOrders.map(table => {
            const statusConfig = getTableStatus(table.status);
            const StatusIcon = statusConfig.icon;
            
            return (
              <div key={table.id} className={`p-6 rounded-2xl shadow-lg ${statusConfig.bg} ${statusConfig.border} ${statusConfig.text}`}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/50 rounded-lg">
                      <StatusIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-xl">Table {table.id}</h3>
                      <p className="text-sm opacity-75 capitalize">{table.status}</p>
                    </div>
                  </div>
                  {table.orderTime && (
                    <div className="text-sm opacity-75 flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {table.orderTime}
                    </div>
                  )}
                </div>
                                <div className="bg-white/50 rounded-xl p-4 mb-4">
                  <div className="grid gap-2">
                    {Object.entries(table.orders).map(([itemId, quantity]) => {
                      const item = state.menuItems.find(i => i.id === parseInt(itemId));
                      const price = item ? getCurrentPrice(item) : 0;
                      return item ? (
                        <div key={itemId} className="flex justify-between items-center">
                          <span className="font-medium">{item.name} ×{quantity}</span>
                          <span className="font-bold">₹{price * quantity}</span>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="text-2xl font-bold">Total: ₹{table.total}</div>
                  <Button
                    onClick={() => updateState({ selectedTable: table.id, activeView: 'menu' })}
                    variant="secondary"
                    size="sm"
                  >
                    View Details
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        
        {activeOrders.length === 0 && (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Utensils className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No Active Orders</h3>
            <p className="text-gray-500">All tables are available or cleared</p>
          </div>
        )}
      </div>
    </div>
  );

  const BillingView = () => (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
            <CreditCard className="w-7 h-7" />
            Billing & Payment
          </h2>
          <p className="text-gray-600 mt-1">Manage table billing and payments</p>
        </div>

        <div className="grid gap-8">
          {[
            { 
              title: 'Ready for Billing', 
              status: 'occupied', 
              action: 'bill', 
              actionText: 'Generate Bill', 
              variant: 'warning',
              icon: CreditCard,
              color: 'from-amber-500 to-orange-600'
            },
            { 
              title: 'Awaiting Payment', 
              status: 'billed', 
              action: 'paid', 
              actionText: 'Mark Paid', 
              variant: 'success',
              icon: DollarSign,
              color: 'from-red-500 to-pink-600'
            },
            { 
              title: 'Ready to Clear', 
              status: 'paid', 
              action: 'clear', 
              actionText: 'Clear Table', 
              variant: 'primary',
              icon: CheckCircle,
              color: 'from-blue-500 to-indigo-600'
            }
          ].map(({ title, status, action, actionText, variant, icon: Icon, color }) => (
            <div key={status} className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className={`p-3 bg-gradient-to-r ${color} rounded-xl`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">{title}</h3>
              </div>
              
              <div className="grid gap-4">
                {Object.values(state.tables)
                  .filter(table => status === 'occupied' ? table.status === status && table.total > 0 : table.status === status)
                  .map(table => (
                    <div key={table.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors duration-200">
                      <div className="flex items-center gap-4">
                        <div className="font-bold text-lg text-gray-800">Table {table.id}</div>
                        <div className="text-2xl font-bold text-green-600">₹{table.total}</div>
                        {table.orderTime && (
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {table.orderTime}
                          </div>
                        )}
                      </div>
                      <Button
                        variant={variant}
                        onClick={() => handleTableAction(table.id, action)}
                        size="sm"
                      >
                        {actionText}
                      </Button>
                    </div>
                  ))}
              </div>
              
              {Object.values(state.tables).filter(table => 
                status === 'occupied' ? table.status === status && table.total > 0 : table.status === status
              ).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Icon className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>No tables in this status</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const MenuManagementView = () => (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
            <Package className="w-7 h-7" />
            Menu Management
          </h2>
          <p className="text-gray-600 mt-1">Manage menu items and pricing</p>
        </div>

        {/* Add New Item Form */}
        {state.showAddItem && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 mb-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Add New Menu Item</h3>
            {state.menuError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-4">
                {state.menuError}
              </div>
            )}
            <div className="grid gap-4">
              <input
                type="text"
                placeholder="Item Name"
                value={state.newItem.name}
                onChange={(e) => updateState({ newItem: { ...state.newItem, name: e.target.value } })}
                className="p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="number"
                placeholder="Base Price"
                value={state.newItem.basePrice}
                onChange={(e) => updateState({ newItem: { ...state.newItem, basePrice: e.target.value } })}
                className="p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <select
                value={state.newItem.category}
                onChange={(e) => updateState({ newItem: { ...state.newItem, category: e.target.value } })}
                className="p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="main">Main Course</option>
                <option value="starter">Starter</option>
                <option value="dessert">Dessert</option>
                <option value="beverage">Beverage</option>
              </select>
              <input
                type="text"
                placeholder="Description"
                value={state.newItem.description}
                onChange={(e) => updateState({ newItem: { ...state.newItem, description: e.target.value } })}
                className="p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="number"
                placeholder="Preparation Time (minutes)"
                value={state.newItem.preparationTime}
                onChange={(e) => updateState({ newItem: { ...state.newItem, preparationTime: e.target.value } })}
                className="p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="flex gap-4">
                <Button
                  onClick={addMenuItem}
                  disabled={state.loading}
                  className="flex-1"
                  size="lg"
                >
                  <Save className="w-5 h-5 mr-2" />
                  Add Item
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => updateState({ 
                    showAddItem: false, 
                    newItem: { name: '', basePrice: '', category: 'main', description: '', preparationTime: 15 },
                    menuError: ''
                  })}
                  className="flex-1"
                  size="lg"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Menu Items List */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-800">Menu Items</h3>
            <Button
              onClick={() => updateState({ showAddItem: true })}
              variant="primary"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Item
            </Button>
          </div>
          
          <div className="grid gap-4">
            {state.menuItems.map(item => (
              <div key={item.id} className="p-4 bg-gray-50 rounded-xl">
                {state.editingItem === item.id ? (
                  <div className="grid gap-4">
                    <input
                      type="text"
                      value={state.newItem.name}
                      onChange={(e) => updateState({ newItem: { ...state.newItem, name: e.target.value } })}
                      className="p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <input
                      type="number"
                      value={state.newItem.basePrice}
                      onChange={(e) => updateState({ newItem: { ...state.newItem, basePrice: e.target.value } })}
                      className="p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <select
                      value={state.newItem.category}
                      onChange={(e) => updateState({ newItem: { ...state.newItem, category: e.target.value } })}
                      className="p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="main">Main Course</option>
                      <option value="starter">Starter</option>
                      <option value="dessert">Dessert</option>
                      <option value="beverage">Beverage</option>
                    </select>
                    <input
                      type="text"
                      value={state.newItem.description}
                      onChange={(e) => updateState({ newItem: { ...state.newItem, description: e.target.value } })}
                      className="p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <input
                      type="number"
                      value={state.newItem.preparationTime}
                      onChange={(e) => updateState({ newItem: { ...state.newItem, preparationTime: e.target.value } })}
                      className="p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <div className="flex gap-4">
                      <Button
                        onClick={() => updateMenuItem(item.id, state.newItem)}
                        disabled={state.loading}
                        className="flex-1"
                        size="sm"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => updateState({ editingItem: null, newItem: { name: '', basePrice: '', category: 'main', description: '', preparationTime: 15 } })}
                        className="flex-1"
                        size="sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-lg text-gray-800">{item.name}</h4>
                      <p className="text-2xl font-bold text-green-600">₹{getCurrentPrice(item)}</p>
                      <p className="text-sm text-gray-500 capitalize">{item.category}</p>
                      {item.description && <p className="text-sm text-gray-600">{item.description}</p>}
                      <p className="text-sm text-gray-500">Prep Time: {item.preparationTime} min</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => updateState({ 
                          editingItem: item.id,
                          newItem: { 
                            name: item.name, 
                            basePrice: item.basePrice, 
                            category: item.category, 
                            description: item.description || '', 
                            preparationTime: item.preparationTime 
                          }
                        })}
                        size="sm"
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => deleteMenuItem(item.id)}
                        size="sm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const DailyPricingView = () => (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
            <Calendar className="w-7 h-7" />
            Daily Pricing
          </h2>
          <p className="text-gray-600 mt-1">Manage daily pricing for menu items</p>
        </div>

        <div className="mb-6">
          <input
            type="date"
            value={state.selectedDate}
            onChange={(e) => updateState({ selectedDate: e.target.value })}
            className="p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {state.menuError && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6">
            {state.menuError}
          </div>
        )}

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Menu Items Pricing</h3>
          <div className="grid gap-4">
            {state.menuItems.map(item => (
              <div key={item.id} className="p-4 bg-gray-50 rounded-xl">
                {state.editingDailyPrice === item.id ? (
                  <div className="grid gap-4">
                    <div className="flex items-center gap-4">
                      <input
                        type="number"
                        placeholder="Daily Price"
                        value={state.newItem.basePrice}
                        onChange={(e) => updateState({ newItem: { ...state.newItem, basePrice: e.target.value } })}
                        className="p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent flex-1"
                      />
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={state.newItem.isAvailable !== false}
                          onChange={(e) => updateState({ newItem: { ...state.newItem, isAvailable: e.target.checked } })}
                          className="w-5 h-5"
                        />
                        Available
                      </label>
                    </div>
                    <div className="flex gap-4">
                      <Button
                        onClick={() => 
                          setDailyPrice(
                            item.id, 
                            state.newItem.basePrice, 
                            state.newItem.isAvailable !== false
                          )
                        }
                        disabled={state.loading}
                        className="flex-1"
                        size="sm"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => updateState({ editingDailyPrice: null, newItem: { name: '', basePrice: '', category: 'main', description: '', preparationTime: 15 } })}
                        className="flex-1"
                        size="sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-lg text-gray-800">{item.name}</h4>
                      <p className="text-2xl font-bold text-green-600">₹{getCurrentPrice(item)}</p>
                      {state.dailyPricing[item.id] && (
                        <p className="text-sm text-gray-500">
                          {state.dailyPricing[item.id].isAvailable 
                            ? `Daily price set for ${state.selectedDate}`
                            : `Not available on ${state.selectedDate}`}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() => updateState({ 
                        editingDailyPrice: item.id,
                        newItem: { 
                          basePrice: state.dailyPricing[item.id]?.price || item.basePrice,
                          isAvailable: state.dailyPricing[item.id]?.isAvailable !== false
                        }
                      })}
                      size="sm"
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const ManagerView = () => (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
              <BarChart3 className="w-7 h-7" />
              Manager Dashboard
            </h2>
            <p className="text-gray-600 mt-1">Business analytics and insights</p>
          </div>
          <Button 
            variant="danger" 
            onClick={() => updateState({ isManager: false, activeView: 'tables' })}
            className="flex items-center gap-2"
            size="sm"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-4 mb-8">
          {[
            { key: 'overview', label: 'Overview', icon: BarChart3 },
            { key: 'menu-management', label: 'Menu Management', icon: Package },
            { key: 'daily-pricing', label: 'Daily Pricing', icon: Calendar },
            { key: 'history', label: 'History', icon: Clock }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => updateState({ activeView: tab.key })}
              className={`px-6 py-3 text-sm rounded-xl font-medium transition-all duration-200 flex items-center gap-2 ${
                state.activeView === tab.key 
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Stats Cards */}
        {state.activeView === 'overview' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[
                { 
                  label: 'Total Revenue', 
                  value: `₹${state.dailyStats.totalRevenue.toLocaleString()}`,
                  icon: DollarSign,
                  color: 'from-emerald-500 to-green-600'
                },
                { 
                  label: 'Total Orders', 
                  value: state.dailyStats.totalOrders.toLocaleString(),
                  icon: Utensils,
                  color: 'from-blue-500 to-indigo-600'
                },
                { 
                  label: 'Avg. Order Value', 
                  value: `₹${state.dailyStats.avgOrderValue.toLocaleString()}`,
                  icon: TrendingUp,
                  color: 'from-purple-500 to-pink-600'
                },
                { 
                  label: 'Active Tables', 
                  value: Object.values(state.tables).filter(t => t.status !== 'available').length,
                  icon: Users,
                  color: 'from-amber-500 to-orange-600'
                }
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-gray-600 font-medium">{label}</p>
                      <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
                    </div>
                    <div className={`p-3 bg-gradient-to-r ${color} rounded-xl`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Popular Items
                </h3>
                <div className="space-y-3">
                  {Object.entries(state.dailyStats.popularItems || {})
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 5)
                    .map(([itemId, count]) => {
                      const item = state.menuItems.find(i => i.id === parseInt(itemId));
                      return item ? (
                        <div key={itemId} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl hover:bg-gray-100">
                          <div>
                            <p className="font-medium text-gray-800">{item.name}</p>
                            <p className="text-sm text-gray-600">₹{getCurrentPrice(item)}</p>
                          </div>
                          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-3 py-1 rounded-lg font-medium">
                            {count} sold
                          </div>
                        </div>
                      ) : null;
                    })}
                  {Object.keys(state.dailyStats.popularItems || {}).length === 0 && (
                    <p className="text-gray-500 text-center py-6">No items sold today</p>
                  )}
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Table Status Overview
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries({
                    available: 'Available',
                    occupied: 'Occupied',
                    billed: 'Billed',
                    paid: 'Paid'
                  }).map(([status, label]) => {
                    const count = Object.values(state.tables).filter(t => t.status === status).length;
                    const statusConfig = getTableStatus(status);
                    const StatusIcon = statusConfig.icon;
                    return (
                      <div key={status} className={`p-4 rounded-xl ${statusConfig.bg} ${statusConfig.border} ${statusConfig.text}`}>
                        <div className="flex items-center gap-3">
                          <StatusIcon className="w-5 h-5" />
                          <div>
                            <p className="text-lg font-bold">{count}</p>
                            <p className="text-sm">{label}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}

        {state.activeView === 'menu-management' && <MenuManagementView />}
        {state.activeView === 'daily-pricing' && <DailyPricingView />}
        {state.activeView === 'history' && (
          <div className="p-6 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
            <div className="max-w-6xl mx-auto">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 mb-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                  <Clock className="w-7 h-7" />
                  Order History
                </h2>
                <p className="text-gray-600 mt-1">Recent completed orders</p>
              </div>

              {state.dailyStats.completedOrders?.length > 0 ? (
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-gray-100/50">
                        <tr>
                          {['Table', 'Items', 'Total', 'Order Time', 'Completed'].map(header => (
                            <th key={header} className="px-6 py-4 font-bold text-gray-800">{header}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200/50">
                        {state.dailyStats.completedOrders.slice(-20).reverse().map((order, index) => (
                          <tr key={index} className="hover:bg-gray-50/50 transition-colors duration-200">
                            <td className="px-6 py-4 font-bold text-gray-800">Table {order.tableId}</td>
                            <td className="px-6 py-4">
                              {Object.entries(order.orders).map(([itemId, qty]) => {
                                const item = state.menuItems.find(i => i.id === parseInt(itemId));
                                return item ? (
                                  <div key={itemId} className="text-sm text-gray-600">{item.name} × {qty}</div>
                                ) : null;
                              })}
                            </td>
                            <td className="px-6 py-4 font-bold text-green-600">₹{order.total}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{order.orderTime}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{order.payTime}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 text-center">
                  <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">No completed orders today</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Error state
  if (state.error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-pink-50 flex items-center justify-center p-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl p-8 max-w-md text-center border border-red-200/50">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Something went wrong</h2>
          <p className="text-gray-600 mb-6">{state.error}</p>
          <Button 
            onClick={() => { updateState({ error: '' }); fetchAllData(); }} 
            variant="primary" 
            size="lg"
            className="w-full"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="pb-8">
        {state.activeView === 'manager-login' && <ManagerLogin />}
        {state.activeView === 'tables' && <TablesView />}
        {state.activeView === 'menu' && state.selectedTable && <MenuView />}
        {state.activeView === 'orders' && <OrdersView />}
        {state.activeView === 'billing' && <BillingView />}
        {state.activeView === 'manager' && state.isManager && <ManagerView />}
        {(state.activeView === 'menu-management' || state.activeView === 'daily-pricing' || state.activeView === 'history') && state.isManager && <ManagerView />}
      </main>
    </div>
  );
};

export default RestaurantPOS;