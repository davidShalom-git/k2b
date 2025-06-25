import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Minus, DollarSign, Users, Clock, CheckCircle, BarChart3, RefreshCw, Menu, X, LogOut, ArrowLeft, Snowflake, ChefHat, Utensils, CreditCard, Timer, TrendingUp, Edit3, Save, Trash2, AlertCircle, Calendar, Package } from 'lucide-react';
import ManagerLogin from '../Components/Manager_Login';
import Manager from '../Components/Manager';

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
    managerToken: '',
    editingItem: null,
    newItem: { name: '', basePrice: '', category: 'main', description: '', preparationTime: 15 },
    showAddItem: false,
    menuError: '',
    dailyPricing: {},
    selectedDate: new Date().toISOString().split('T')[0],
    editingDailyPrice: null,
    showDailyPricing: false
  });

  const updateState = useCallback((updates) => setState(prev => ({ ...prev, ...updates })), []);

 const apiCall = useCallback(async (endpoint, method = 'GET', body = null) => {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (state.isManager && state.managerToken) {
      headers['Authorization'] = `Bearer ${state.managerToken}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers,
      ...(body && { body: JSON.stringify(body) })
    });

    const data = await response.json();

    if (!response.ok) {
      const message = data?.error || data?.message || response.statusText;
      throw new Error(`API Error: ${message}`);
    }

    return data;
  } catch (err) {
    throw new Error(`API Error: ${err.message}`);
  }
}, [state.isManager, state.managerToken]);

  const filteredTables = useMemo(() => {
    return Object.values(state.tables).filter(table => {
      return state.roomType === 'ac' ? table.id > 20 : table.id <= 20;
    });
  }, [state.tables, state.roomType]);

  const activeOrders = useMemo(() => {
    return Object.values(state.tables).filter(table => 
      table.status !== 'available' && Object.keys(table.orders || {}).length > 0
    );
  }, [state.tables]);

  const getCurrentPrice = useCallback((menuItem) => {
    const dailyPrice = state.dailyPricing[menuItem.id];
    return dailyPrice?.price || menuItem.basePrice || menuItem.price;
  }, [state.dailyPricing]);

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

  const calculateTotal = useCallback((orders) => {
    return Object.entries(orders || {}).reduce((sum, [id, qty]) => {
      const item = state.menuItems.find(item => item.id === parseInt(id));
      const price = item ? getCurrentPrice(item) : 0;
      return sum + (price * qty);
    }, 0);
  }, [state.menuItems, getCurrentPrice]);

  const updateTable = useCallback(async (tableId, updates) => {
    try {
      const updatedTable = await apiCall(`/tables/${tableId}`, 'PUT', updates);
      updateState({ tables: { ...state.tables, [tableId]: updatedTable } });
      return updatedTable;
    } catch (err) {
      console.error('Update Table Error:', err);
      updateState({ error: 'Failed to update table: ' + err.message });
      throw err;
    }
  }, [apiCall, updateState, state.tables]);

  const handleTableAction = useCallback(async (tableId, action, itemId = null) => {
    const table = state.tables[tableId];
    if (!table) {
      console.error('Table not found:', tableId);
      return;
    }

    console.log('Table action:', { tableId, action, itemId, table });

    try {
      switch (action) {
        case 'addItem': {
          if (!itemId) {
            console.error('Item ID is required for addItem action');
            return;
          }
          
          // Initialize orders if it doesn't exist
          const currentOrders = table.orders || {};
          const newOrders = { 
            ...currentOrders, 
          [itemId]: Number(currentOrders[itemId] || 0) + 1
          };
          
          const newTotal = calculateTotal(newOrders);
          
          const updates = {
            orders: newOrders,
            total: newTotal,
            status: table.status === 'available' ? 'occupied' : table.status,
            orderTime: table.status === 'available' ? new Date().toLocaleTimeString() : table.orderTime
          };
          
          console.log('Adding item - Updates:', updates);
          await updateTable(tableId, updates);
          break;
        }
        
        case 'removeItem': {
          if (!itemId) {
            console.error('Item ID is required for removeItem action');
            return;
          }
          
          const currentOrders = table.orders || {};
          const newOrders = { ...currentOrders };
          
          if (newOrders[itemId] && newOrders[itemId] > 0) {
            newOrders[itemId]--;
            if (newOrders[itemId] === 0) {
              delete newOrders[itemId];
            }
          }
          
          const newTotal = calculateTotal(newOrders);
          
          const updates = {
            orders: newOrders,
            total: newTotal,
            status: Object.keys(newOrders).length === 0 ? 'available' : table.status
          };
          
          console.log('Removing item - Updates:', updates);
          await updateTable(tableId, updates);
          break;
        }
        
        case 'bill':
          await updateTable(tableId, { 
            status: 'billed', 
            billTime: new Date().toLocaleTimeString() 
          });
          break;
          
        case 'paid':
          await updateTable(tableId, { 
            status: 'paid', 
            payTime: new Date().toLocaleTimeString() 
          });
          break;
          
        case 'clear':
          await apiCall('/complete-order', 'POST', { tableId, orderData: table });
          await fetchAllData();
          break;
          
        default:
          console.error('Unknown action:', action);
      }
    } catch (err) {
      console.error('Error in handleTableAction:', err);
      updateState({ error: 'Failed to perform action: ' + err.message });
    }
  }, [state.tables, updateTable, calculateTotal, apiCall, fetchAllData, updateState]);

  const handleManagerLogin = useCallback(async (event) => {
    event.preventDefault();
    try {
      updateState({ loading: true, error: '' });
      const data = await apiCall('/auth/manager', 'POST', { password: state.managerPassword });
      if (data.success) {
        updateState({ 
          isManager: true, 
          activeView: 'manager', 
          managerPassword: '', 
          loading: false,
          managerToken: 'manager_authenticated'
        });
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

  const getTableStatus = (status) => {
    const statusConfig = {
      available: { bg: 'bg-gradient-to-br from-emerald-50 to-green-100', border: 'border-emerald-200', text: 'text-emerald-800', icon: Users, pulse: false },
      occupied: { bg: 'bg-gradient-to-br from-amber-50 to-yellow-100', border: 'border-amber-200', text: 'text-amber-800', icon: Timer, pulse: true },
      billed: { bg: 'bg-gradient-to-br from-rose-50 to-red-100', border: 'border-rose-200', text: 'text-rose-800', icon: CreditCard, pulse: false },
      paid: { bg: 'bg-gradient-to-br from-blue-50 to-indigo-100', border: 'border-blue-200', text: 'text-blue-800', icon: CheckCircle, pulse: false }
    };
    return statusConfig[status] || statusConfig.available;
  };

  const Button = ({ children, onClick, variant = 'primary', disabled = false, className = '', size = 'md' }) => {
    const variants = {
      primary: 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl',
      success: 'bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800 text-white shadow-lg hover:shadow-xl',
      danger: 'bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 text-white shadow-lg hover:shadow-xl',
      warning: 'bg-gradient-to-r from-amber-600 to-orange-700 hover:from-amber-700 hover:to-orange-800 text-white shadow-lg hover:shadow-xl',
      secondary: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-sm hover:shadow-md'
    };
    const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2 text-base', lg: 'px-6 py-3 text-lg' };
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`${sizes[size]} rounded-xl font-medium transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:transform-none ${variants[variant]} ${className}`}
      >
        {children}
      </button>
    );
  };

  const Header = () => (
    <header className="bg-white/90 backdrop-blur-md shadow-lg border-b border-gray-200/50 sticky top-0 z-50">
      <div className="px-4 sm:px-6 py-4 max-w-7xl mx-auto">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3 sm:gap-4">
            {state.selectedTable && (
              <button
                onClick={() => updateState({ selectedTable: null, activeView: 'tables' })}
                className="p-2 hover:bg-gray-100 rounded-xl transition-all duration-200"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl">
                <ChefHat className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                  Restaurant POS
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">Modern Point of Sale</p>
              </div>
            </div>
            {state.loading && <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-blue-600" />}
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button 
              onClick={fetchAllData} 
              disabled={state.loading} 
              variant="secondary"
              className="p-2"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <button
              onClick={() => updateState({ showMobileMenu: !state.showMobileMenu })}
              className="p-2 sm:hidden hover:bg-gray-100 rounded-xl transition-all duration-200"
            >
              {state.showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        {!state.selectedTable && (
          <nav className={`${state.showMobileMenu ? 'flex' : 'hidden'} sm:flex flex-col sm:flex-row gap-2 mt-4 sm:mt-6 ${state.showMobileMenu ? 'bg-white p-4 rounded-xl shadow-lg' : ''}`}>
            {[
              { key: 'tables', label: 'Tables', icon: Users },
              { key: 'orders', label: 'Orders', icon: Utensils },
              { key: 'billing', label: 'Billing', icon: CreditCard },
              { key: state.isManager ? 'manager' : 'manager-login', label: 'Manager', icon: BarChart3 }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => updateState({ activeView: tab.key, showMobileMenu: false })}
                className={`px-4 py-2 sm:px-6 sm:py-3 text-sm rounded-xl font-medium transition-all duration-200 flex items-center gap-2 ${
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

  const TablesView = () => (
    <div className="p-4 sm:p-6 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row gap-3 mb-6 sm:mb-8">
          <button
            onClick={() => updateState({ roomType: 'regular' })}
            className={`flex-1 px-4 py-2 sm:px-6 sm:py-3 rounded-xl flex items-center justify-center gap-2 sm:gap-3 font-medium transition-all duration-200 ${
              state.roomType === 'regular' 
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg' 
                : 'bg-white hover:bg-gray-50 text-gray-700 shadow-md'
            }`}
          >
            <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            Regular Tables
          </button>
          <button
            onClick={() => updateState({ roomType: 'ac' })}
            className={`flex-1 px-4 py-2 sm:px-6 sm:py-3 rounded-xl flex items-center justify-center gap-2 sm:gap-3 font-medium transition-all duration-200 ${
              state.roomType === 'ac' 
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg' 
                : 'bg-white hover:bg-gray-50 text-gray-700 shadow-md'
            }`}
          >
            <Snowflake className="w-4 h-4 sm:w-5 sm:h-5" />
            AC Room
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
          {filteredTables.map(table => {
            const statusConfig = getTableStatus(table.status);
            const StatusIcon = statusConfig.icon;
            return (
              <div
                key={table.id}
                onClick={() => updateState({ selectedTable: table.id, activeView: 'menu' })}
                className={`relative p-4 sm:p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 transform hover:scale-105 hover:shadow-xl ${statusConfig.bg} ${statusConfig.border} ${statusConfig.text} ${statusConfig.pulse ? 'animate-pulse' : ''}`}
              >
                <div className="flex justify-between items-start mb-3 sm:mb-4">
                  <div>
                    <h3 className="font-bold text-base sm:text-lg">Table {table.id}</h3>
                    <p className="text-xs sm:text-sm opacity-75 capitalize">{table.status}</p>
                  </div>
                  <div className="p-2 bg-white/50 rounded-lg">
                    <StatusIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                </div>
                {table.total > 0 && (
                  <div className="bg-white/50 rounded-lg p-2 sm:p-3 mb-2">
                    <div className="font-bold text-base sm:text-lg">₹{table.total}</div>
                  </div>
                )}
                {table.orderTime && (
                  <div className="text-xs opacity-70 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {table.orderTime}
                  </div>
                )}
                {table.status === 'occupied' && (
                  <div className="absolute -top-2 -right-2 w-3 h-3 sm:w-4 sm:h-4 bg-red-500 rounded-full animate-ping"></div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const MenuView = () => {
    const currentTable = state.tables[state.selectedTable];
    if (!currentTable) {
      return (
        <div className="p-4 sm:p-6 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-lg text-gray-600">Table not found</p>
          </div>
        </div>
      );
    }

    return (
      <div className="p-4 sm:p-6 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-4 sm:p-6 mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Table {state.selectedTable}</h2>
            <p className="text-sm text-gray-600">Select items to add to order</p>
          </div>
          
          {currentTable.total > 0 && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6">
              <h3 className="font-bold text-base sm:text-lg mb-3 sm:mb-4 text-blue-800 flex items-center gap-2">
                <Utensils className="w-4 h-4 sm:w-5 sm:h-5" />
                Current Order
              </h3>
              <div className="space-y-2 mb-3 sm:mb-4">
                {Object.entries(currentTable.orders || {}).map(([itemId, qty]) => {
                  const item = state.menuItems.find(i => i.id === parseInt(itemId));
                  const price = item ? getCurrentPrice(item) : 0;
                  return item ? (
                    <div key={itemId} className="flex justify-between items-center py-2 px-3 bg-white/50 rounded-lg text-sm sm:text-base">
                      <span className="font-medium">{item.name} × {qty}</span>
                      <span className="font-bold text-blue-700">₹{price * qty}</span>
                      <Button
                        variant="danger"
                        onClick={(e) => {
                          e.preventDefault();
                          console.log('Remove button clicked for item:', itemId);
                          handleTableAction(state.selectedTable, 'removeItem', itemId);
                        }}
                        disabled={!currentTable.orders || !currentTable.orders[itemId] || qty <= 0}
                        className="p-2"
                        size="sm"
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : null;
                })}
              </div>
              <div className="border-t border-blue-200 pt-3 sm:pt-4">
                <div className="flex justify-between items-center text-base sm:text-xl font-bold text-blue-800">
                  <span>Total Amount</span>
                  <span>₹{currentTable.total}</span>
                </div>
              </div>
            </div>
          )}
          
          <div className="grid gap-4 mb-6 sm:mb-8">
            {state.menuItems.map(item => {
              const currentPrice = getCurrentPrice(item);
              const dailyPrice = state.dailyPricing[item.id];
              const isSpecialPrice = dailyPrice && dailyPrice.price !== item.basePrice;
              return (
                <div key={item.id} className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-4 sm:p-6 hover:shadow-xl transition-all duration-300">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-base sm:text-lg text-gray-800">{item.name}</h4>
                        {isSpecialPrice && (
                          <span className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-2 py-1 rounded-lg text-xs font-medium">
                            Special Price
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-lg sm:text-2xl font-bold text-green-600">₹{currentPrice}</p>
                        {isSpecialPrice && (
                          <p className="text-sm sm:text-lg text-gray-500 line-through">₹{item.basePrice}</p>
                        )}
                      </div>
                      {item.category && (
                        <p className="text-xs sm:text-sm text-gray-500 capitalize">{item.category}</p>
                      )}
                    </div>
                    <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
                      <Button
                        variant="success"
                        onClick={(e) => {
                          e.preventDefault();
                          console.log('Add button clicked for item:', item.id, 'table:', state.selectedTable);
                          handleTableAction(state.selectedTable, 'addItem', item.id);
                        }}
                        disabled={['billed', 'paid'].includes(currentTable.status)}
                        className="flex-1 p-2 sm:p-3 rounded-xl"
                      >
                        <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                      </Button>
                      <Button
                        variant="danger"
                        onClick={(e) => {
                          e.preventDefault();
                          console.log('Remove button clicked for item:', item.id);
                          handleTableAction(state.selectedTable, 'removeItem', item.id);
                        }}
                        disabled={!currentTable.orders || !currentTable.orders[item.id]}
                        className="flex-1 p-2 sm:p-3 rounded-xl"
                      >
                        <Minus className="w-4 h-4 sm:w-5 sm:h-5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            {currentTable.status === 'occupied' && currentTable.total > 0 && (
              <Button
                variant="warning"
                onClick={() => handleTableAction(state.selectedTable, 'bill')}
                className="flex-1 py-3 sm:py-4 text-base sm:text-lg font-medium"
              >
                <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Generate Bill
              </Button>
            )}
            {currentTable.status === 'billed' && (
              <Button
                variant="success"
                onClick={() => handleTableAction(state.selectedTable, 'paid')}
                className="flex-1 py-3 sm:py-4 text-base sm:text-lg font-medium"
              >
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Mark as Paid
              </Button>
            )}
            {currentTable.status === 'paid' && (
              <Button
                variant="primary"
                onClick={() => handleTableAction(state.selectedTable, 'clear')}
                className="flex-1 py-3 sm:py-4 text-base sm:text-lg font-medium"
              >
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Clear Table
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const OrdersView = () => (
    <div className="p-4 sm:p-6 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
            <Utensils className="w-5 h-5 sm:w-6 sm:h-6" />
            Active Orders
          </h2>
          <p className="text-sm text-gray-600">Manage all active table orders</p>
        </div>

        {activeOrders.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 text-center">
            <Utensils className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">No Active Orders</h3>
            <p className="text-sm text-gray-500">All tables are currently available</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-6">
            {activeOrders.map(table => {
              const statusConfig = getTableStatus(table.status);
              const StatusIcon = statusConfig.icon;
              return (
                <div key={table.id} className={`bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-4 sm:p-6 border-l-4 ${table.status === 'occupied' ? 'border-amber-500' : table.status === 'billed' ? 'border-rose-500' : 'border-blue-500'}`}>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${statusConfig.bg}`}>
                        <StatusIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">Table {table.id}</h3>
                        <p className="text-sm text-gray-600 capitalize">{table.status}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">₹{table.total}</p>
                      {table.orderTime && (
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {table.orderTime}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-xl p-4 mb-4">
                    <h4 className="font-medium text-gray-700 mb-3">Order Details</h4>
                    <div className="space-y-2">
                      {Object.entries(table.orders || {}).map(([itemId, qty]) => {
                        const item = state.menuItems.find(i => i.id === parseInt(itemId));
                        const price = item ? getCurrentPrice(item) : 0;
                        return item ? (
                          <div key={itemId} className="flex justify-between items-center text-sm">
                            <span>{item.name} × {qty}</span>
                            <span className="font-medium">₹{price * qty}</span>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="primary"
                      onClick={() => updateState({ selectedTable: table.id, activeView: 'menu' })}
                      size="sm"
                    >
                      <Edit3 className="w-4 h-4 mr-1" />
                      Edit Order
                    </Button>
                    {table.status === 'occupied' && table.total > 0 && (
                      <Button
                        variant="warning"
                        onClick={() => handleTableAction(table.id, 'bill')}
                        size="sm"
                      >
                        <CreditCard className="w-4 h-4 mr-1" />
                        Generate Bill
                      </Button>
                    )}
                    {table.status === 'billed' && (
                      <Button
                        variant="success"
                        onClick={() => handleTableAction(table.id, 'paid')}
                        size="sm"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Mark Paid
                      </Button>
                    )}
                    {table.status === 'paid' && (
                      <Button
                        variant="primary"
                        onClick={() => handleTableAction(table.id, 'clear')}
                        size="sm"
                      >
                        <Package className="w-4 h-4 mr-1" />
                        Clear Table
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  const BillingView = () => (
    <div className="p-4 sm:p-6 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
            <CreditCard className="w-5 h-5 sm:w-6 sm:h-6" />
            Billing Dashboard
          </h2>
          <p className="text-sm text-gray-600">Daily statistics and revenue overview</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
          <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl p-4 sm:p-6 border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 text-green-600" />
              <span className="text-xs font-medium text-green-700 bg-green-200 px-2 py-1 rounded-lg">Today</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-green-700">₹{state.dailyStats.totalRevenue}</p>
            <p className="text-sm text-green-600">Total Revenue</p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-4 sm:p-6 border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <Utensils className="w-8 h-8 text-blue-600" />
              <span className="text-xs font-medium text-blue-700 bg-blue-200 px-2 py-1 rounded-lg">Count</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-blue-700">{state.dailyStats.totalOrders}</p>
            <p className="text-sm text-blue-600">Total Orders</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-violet-100 rounded-2xl p-4 sm:p-6 border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <BarChart3 className="w-8 h-8 text-purple-600" />
              <span className="text-xs font-medium text-purple-700 bg-purple-200 px-2 py-1 rounded-lg">Avg</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-purple-700">₹{state.dailyStats.avgOrderValue}</p>
            <p className="text-sm text-purple-600">Average Order</p>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-red-100 rounded-2xl p-4 sm:p-6 border border-orange-200">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-orange-600" />
              <span className="text-xs font-medium text-orange-700 bg-orange-200 px-2 py-1 rounded-lg">Active</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-orange-700">{activeOrders.length}</p>
            <p className="text-sm text-orange-600">Active Orders</p>
          </div>
        </div>

        {Object.keys(state.dailyStats.popularItems || {}).length > 0 && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-4 sm:p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Popular Items Today
            </h3>
            <div className="space-y-3">
              {Object.entries(state.dailyStats.popularItems)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5)
                .map(([itemName, count]) => (
                  <div key={itemName} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-700">{itemName}</span>
                    <span className="text-lg font-bold text-blue-600">{count} orders</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Main render function
  const renderContent = () => {
    if (state.error) {
      return (
        <div className="p-4 sm:p-6 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen flex items-center justify-center">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 sm:p-8 max-w-md w-full">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-800 mb-2">Error</h3>
              <p className="text-sm text-gray-600 mb-4">{state.error}</p>
              <Button onClick={() => { updateState({ error: '' }); fetchAllData(); }}>
                Try Again
              </Button>
            </div>
          </div>
        </div>
      );
    }

    if (state.selectedTable) {
      return <MenuView />;
    }

    switch (state.activeView) {
      case 'tables':
        return <TablesView />;
      case 'orders':
        return <OrdersView />;
      case 'billing':
        return <BillingView />;
      case 'manager-login':
        return <ManagerLogin onLogin={handleManagerLogin} />;
      case 'manager':
        return state.isManager ? <Manager /> : <ManagerLogin onLogin={handleManagerLogin} />;
      default:
        return <TablesView />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Header />
      {renderContent()}
    </div>
  );
};

export default RestaurantPOS;