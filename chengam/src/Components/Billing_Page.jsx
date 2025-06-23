import React, { useState, useEffect } from 'react';
import { Plus, Minus, DollarSign, Users, Clock, CheckCircle, BarChart3, TrendingUp, RefreshCw, Menu, X, LogOut } from 'lucide-react';

const RestaurantPOS = () => {
  const API_BASE_URL = 'http://localhost:3000/api/hotel';
  
  const [state, setState] = useState({
    menuItems: [],
    tables: {},
    selectedTable: 1,
    activeView: 'tables',
    dailyStats: { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0, popularItems: {}, completedOrders: [] },
    loading: false,
    error: '',
    isManager: false,
    managerPassword: '',
    showMobileMenu: false
  });

  const updateState = (updates) => setState(prev => ({ ...prev, ...updates }));

  // API Helper
  const apiCall = async (endpoint, method = 'GET', body = null) => {
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
  };

  // Data Fetching
  const fetchAllData = async () => {
    if (state.loading) return; // Prevent concurrent fetches
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
  };

  // Table Operations
  const calculateTotal = (orders) => {
    return Object.entries(orders).reduce((sum, [id, qty]) => {
      const item = state.menuItems.find(item => item.id === parseInt(id));
      return sum + (item ? item.price * qty : 0);
    }, 0);
  };

  const updateTable = async (tableId, updates) => {
    try {
      const updatedTable = await apiCall(`/tables/${tableId}`, 'PUT', updates);
      updateState({ tables: { ...state.tables, [tableId]: updatedTable } });
    } catch (err) {
      updateState({ error: 'Failed to update table: ' + err.message });
    }
  };

  const completeOrder = async (tableId, orderData) => {
    try {
      await apiCall('/complete-order', 'POST', { tableId, orderData });
      await fetchAllData();
    } catch (err) {
      updateState({ error: 'Failed to complete order: ' + err.message });
    }
  };

  // Table Actions
  const tableActions = {
    addItem: async (tableId, itemId, event) => {
      event.preventDefault(); // Prevent default behavior
      const table = state.tables[tableId];
      const newOrders = { ...table.orders, [itemId]: (table.orders[itemId] || 0) + 1 };
      const updates = {
        orders: newOrders,
        total: calculateTotal(newOrders),
        status: table.status === 'available' ? 'occupied' : table.status,
        orderTime: table.status === 'available' ? new Date().toLocaleTimeString() : table.orderTime
      };
      await updateTable(tableId, updates);
    },

    removeItem: async (tableId, itemId, event) => {
      event.preventDefault(); // Prevent default behavior
      const table = state.tables[tableId];
      const newOrders = { ...table.orders };
      if (newOrders[itemId] > 0) {
        newOrders[itemId]--;
        if (newOrders[itemId] === 0) delete newOrders[itemId];
      }
      const updates = {
        orders: newOrders,
        total: calculateTotal(newOrders),
        status: Object.keys(newOrders).length === 0 ? 'available' : table.status,
        orderTime: Object.keys(newOrders).length === 0 ? null : table.orderTime
      };
      await updateTable(tableId, updates);
    },

    processTable: async (tableId, action, event) => {
      event.preventDefault(); // Prevent default behavior
      const table = state.tables[tableId];
      const actions = {
        bill: { status: 'billed', billTime: new Date().toLocaleTimeString() },
        paid: { status: 'paid', payTime: new Date().toLocaleTimeString() }
      };
      
      if (action === 'clear') {
        const orderData = {
          tableId: table.id, total: table.total, orders: table.orders,
          orderTime: table.orderTime, billTime: table.billTime, payTime: table.payTime
        };
        await completeOrder(tableId, orderData);
      } else {
        await updateTable(tableId, actions[action]);
      }
    }
  };

  // Manager Login
  const handleManagerLogin = async (event) => {
    event.preventDefault(); // Prevent form submission
    if (!state.managerPassword.trim()) {
      updateState({ error: 'Please enter password' });
      return;
    }
    
    try {
      updateState({ loading: true, error: '' });
      const data = await apiCall('/auth/manager', 'POST', { password: state.managerPassword });
      if (data.success) {
        updateState({ 
          isManager: true, 
          activeView: 'manager', 
          managerPassword: '', 
          loading: false 
        });
        await fetchAllData();
      } else {
        updateState({ error: 'Invalid manager password', loading: false });
      }
    } catch (err) {
      updateState({ error: 'Manager login failed: ' + err.message, loading: false });
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Auto-refresh for manager
  useEffect(() => {
    if (state.activeView === 'manager' && state.isManager) {
      const interval = setInterval(fetchAllData, 30000);
      return () => clearInterval(interval);
    }
  }, [state.activeView, state.isManager]);

  // Utility Functions
  const getTableColor = (status) => ({
    available: 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200/50 text-emerald-700 hover:from-emerald-100 hover:to-teal-100 shadow-emerald-100/50',
    occupied: 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200/50 text-amber-700 hover:from-amber-100 hover:to-orange-100 shadow-amber-100/50',
    billed: 'bg-gradient-to-br from-rose-50 to-pink-50 border-rose-200/50 text-rose-700 hover:from-rose-100 hover:to-pink-100 shadow-rose-100/50',
    paid: 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200/50 text-blue-700 hover:from-blue-100 hover:to-indigo-100 shadow-blue-100/50'
  })[status] || 'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200/50 text-gray-700';

  const getStatusIcon = (status) => ({
    available: <Users className="w-5 h-5" />,
    occupied: <Clock className="w-5 h-5" />,
    billed: <DollarSign className="w-5 h-5" />,
    paid: <CheckCircle className="w-5 h-5" />
  })[status];

  // Components
  const Header = () => (
    <header className="bg-white/80 backdrop-blur-xl shadow-lg border-b border-gray-100/50 sticky top-0 z-50">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Restaurant POS
              </h1>
              <p className="text-sm text-gray-500">Modern Point of Sale</p>
            </div>
            {state.loading && <RefreshCw className="w-5 h-5 animate-spin text-blue-500 ml-4" />}
          </div>
          
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); fetchAllData(); }}
              className="p-3 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50"
              disabled={state.loading}
            >
              <RefreshCw className={`w-5 h-5 ${state.loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); updateState({ showMobileMenu: !state.showMobileMenu }); }}
              className="lg:hidden p-3 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
            >
              {state.showMobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
        
        <nav className={`${state.showMobileMenu ? 'block' : 'hidden'} lg:block pb-6 lg:pb-0`}>
          <div className="flex flex-col lg:flex-row lg:space-x-2 space-y-2 lg:space-y-0">
            {[
              { key: 'tables', label: 'Tables' },
              { key: 'orders', label: 'Orders' },
              { key: 'billing', label: 'Billing' },
              ...(state.isManager ? [{ key: 'history', label: 'History' }] : []),
              { key: state.isManager ? 'manager' : 'manager-login', label: 'Manager' }
            ].map(tab => (
              <button
                type="button"
                key={tab.key}
                onClick={(e) => { e.preventDefault(); updateState({ activeView: tab.key, showMobileMenu: false }); }}
                className={`px-6 py-3 text-sm font-medium rounded-xl transition-all duration-300 transform hover:scale-105 ${
                  state.activeView === tab.key 
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25' 
                    : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </nav>
      </div>
    </header>
  );

  const ManagerLogin = () => (
    <div className="min-h-[calc(100vh-5rem)] bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <form
        onSubmit={handleManagerLogin}
        className="bg-white/80 backdrop-blur-xl p-10 rounded-3xl shadow-2xl w-full max-w-md border border-white/20"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <DollarSign className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">Manager Access</h2>
          <p className="text-gray-500 mt-2">Enter your credentials to continue</p>
        </div>
        
        {state.error && (
          <div className="bg-red-50 border-l-4 border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6 animate-pulse">
            {state.error}
          </div>
        )}
        
        <div className="space-y-6">
          <div className="relative">
            <input
              type="password"
              placeholder="Enter Manager Password"
              value={state.managerPassword}
              onChange={(e) => updateState({ managerPassword: e.target.value })}
              className="w-full px-6 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white/50 backdrop-blur-sm"
              autoFocus
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-4 rounded-xl font-medium transition-all transform hover:scale-105 disabled:opacity-50 shadow-lg"
            disabled={state.loading}
          >
            {state.loading ? 'Logging in...' : 'Login'}
          </button>
          
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); updateState({ activeView: 'tables', error: '', managerPassword: '' }); }}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-4 rounded-xl font-medium transition-all transform hover:scale-105"
          >
            Back to Staff Mode
          </button>
        </div>
      </form>
    </div>
  );

  const TablesView = () => (
    <div className="space-y-8">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
        {Object.values(state.tables).map(table => (
          <div
            key={table.id}
            className={`p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 shadow-lg ${getTableColor(table.status)} ${
              state.selectedTable === table.id ? 'ring-4 ring-blue-400/50 shadow-2xl scale-105' : ''
            }`}
            onClick={(e) => {updateState({ selectedTable: table.id }); }}
           
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-lg">Table {table.id}</span>
              <div className="p-2 bg-white/50 rounded-xl shadow-sm">
                {getStatusIcon(table.status)}
              </div>
            </div>
            <div className="text-sm font-medium capitalize mb-2 opacity-80">{table.status}</div>
            {table.total > 0 && (
              <div className="text-lg font-bold mb-2">₹{table.total}</div>
            )}
            {table.orderTime && (
              <div className="text-xs opacity-70 bg-white/30 px-2 py-1 rounded-lg">
                Ordered: {table.orderTime}
              </div>
            )}
          </div>
        ))}
      </div>

      {state.selectedTable && (
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
          <h3 className="text-2xl font-bold mb-6 bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Table {state.selectedTable} - Order Menu
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {state.menuItems.map(item => (
              <div key={item.id} className="flex justify-between items-center p-4 bg-gradient-to-r from-gray-50 to-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all">
                <div>
                  <div className="font-semibold text-gray-900">{item.name}</div>
                  <div className="text-sm text-gray-600 font-medium">₹{item.price}</div>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={(e) => tableActions.addItem(state.selectedTable, item.id, e)}
                    className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white p-3 rounded-xl transition-all transform hover:scale-110 disabled:opacity-50 shadow-lg"
                    disabled={['billed', 'paid'].includes(state.tables[state.selectedTable]?.status)}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => tableActions.removeItem(state.selectedTable, item.id, e)}
                    className="bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 text-white p-3 rounded-xl transition-all transform hover:scale-110 disabled:opacity-50 shadow-lg"
                    disabled={['billed', 'paid'].includes(state.tables[state.selectedTable]?.status) || !state.tables[state.selectedTable]?.orders[item.id]}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            {[
              { action: 'bill', label: 'Generate Bill', color: 'from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600', condition: state.tables[state.selectedTable]?.status === 'occupied' && state.tables[state.selectedTable]?.total > 0 },
              { action: 'paid', label: 'Mark as Paid', color: 'from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600', condition: state.tables[state.selectedTable]?.status === 'billed' },
              { action: 'clear', label: 'Clear Table', color: 'from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600', condition: state.tables[state.selectedTable]?.status === 'paid' }
            ].map(({ action, label, color, condition }) => (
              <button
                type="button"
                key={action}
                onClick={(e) => tableActions.processTable(state.selectedTable, action, e)}
                className={`flex-1 bg-gradient-to-r ${color} text-white py-4 rounded-xl font-medium transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg`}
                disabled={!condition}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const OrdersView = () => (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">Active Orders</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {Object.values(state.tables)
          .filter(table => table.status !== 'available' && Object.keys(table.orders).length > 0)
          .map(table => (
            <div key={table.id} className={`p-6 rounded-2xl border-2 shadow-lg transition-all duration-300 hover:shadow-xl transform hover:-translate-y-1 ${getTableColor(table.status)}`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold">Table {table.id}</h3>
                  <span className="text-sm font-medium capitalize opacity-80">{table.status}</span>
                </div>
                <div className="p-2 bg-white/50 rounded-xl">
                  {getStatusIcon(table.status)}
                </div>
              </div>
              
              <div className="space-y-2 mb-4">
                {Object.entries(table.orders).map(([itemId, quantity]) => {
                  const item = state.menuItems.find(i => i.id === parseInt(itemId));
                  return item ? (
                    <div key={itemId} className="flex justify-between text-sm bg-white/30 p-2 rounded-lg">
                      <span className="font-medium">{item.name} ×{quantity}</span>
                      <span className="font-bold">₹{item.price * quantity}</span>
                    </div>
                  ) : null;
                })}
              </div>
              
              <div className="border-t border-white/30 pt-3">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span>₹{table.total}</span>
                </div>
                {table.orderTime && (
                  <div className="text-xs opacity-70 mt-2 bg-white/30 px-2 py-1 rounded">
                    Ordered: {table.orderTime}
                  </div>
                )}
              </div>
            </div>
          ))}
      </div>
      
      {Object.values(state.tables).filter(table => table.status !== 'available' && Object.keys(table.orders).length > 0).length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <Clock className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-xl">No active orders</p>
          <p className="text-sm opacity-70">Orders will appear here when tables place orders</p>
        </div>
      )}
    </div>
  );

  const BillingView = () => {
    const billingSections = [
      { title: 'Ready for Billing', status: 'occupied', color: 'from-amber-50 to-orange-50 border-amber-200/50', buttonColor: 'from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600', action: 'bill', actionText: 'Generate Bill' },
      { title: 'Awaiting Payment', status: 'billed', color: 'from-rose-50 to-pink-50 border-rose-200/50', buttonColor: 'from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600', action: 'paid', actionText: 'Mark Paid' },
      { title: 'Ready to Clear', status: 'paid', color: 'from-blue-50 to-indigo-50 border-blue-200/50', buttonColor: 'from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600', action: 'clear', actionText: 'Clear' }
    ];

    return (
      <div className="space-y-8">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">Billing & Payment</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {billingSections.map(({ title, status, color, buttonColor, action, actionText }) => (
            <div key={status} className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl p-8 border border-white/20">
              <h3 className="text-xl font-bold mb-6 text-gray-800">{title}</h3>
              <div className="space-y-4">
                {Object.values(state.tables)
                  .filter(table => status === 'occupied' ? table.status === status && table.total > 0 : table.status === status)
                  .map(table => (
                    <div key={table.id} className={`flex justify-between items-center p-4 rounded-2xl border-2 bg-gradient-to-r ${color} shadow-sm hover:shadow-md transition-all`}>
                      <div>
                        <span className="font-bold text-lg">Table {table.id}</span>
                        <div className="text-sm font-semibold text-gray-700">₹{table.total}</div>
                        {table.billTime && <div className="text-xs text-gray-600">Billed: {table.billTime}</div>}
                        {table.payTime && <div className="text-xs text-gray-600">Paid: {table.payTime}</div>}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => tableActions.processTable(table.id, action, e)}
                        className={`bg-gradient-to-r ${buttonColor} text-white px-4 py-2 rounded-xl text-sm font-medium transition-all transform hover:scale-105 shadow-lg`}
                      >
                        {actionText}
                      </button>
                    </div>
                  ))}
                {Object.values(state.tables).filter(table => status === 'occupied' ? table.status === status && table.total > 0 : table.status === status).length === 0 && (
                  <p className="text-gray-500 text-center py-8 opacity-70">No items</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const HistoryView = () => (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">Order History</h2>
      
      {state.dailyStats.completedOrders?.length > 0 ? (
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl overflow-hidden border border-white/20">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  {['Table', 'Items', 'Total', 'Order Time', 'Completed'].map(header => (
                    <th key={header} className="px-6 py-4 text-left text-sm font-bold text-gray-900">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {state.dailyStats.completedOrders.slice().reverse().map((order, index) => (
                  <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold">Table {order.tableId}</td>
                    <td className="px-6 py-4 text-sm">
                      <div className="space-y-1">
                        {Object.entries(order.orders).map(([itemId, quantity]) => {
                          const item = state.menuItems.find(i => i.id === parseInt(itemId));
                          return item ? (
                            <div key={itemId} className="text-xs bg-gray-100 px-2 py-1 rounded">{item.name} ×{quantity}</div>
                          ) : null;
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold">₹{order.total}</td>
                    <td className="px-6 py-4 text-sm">{order.orderTime}</td>
                    <td className="px-6 py-4 text-sm">{order.payTime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 text-gray-500">
          <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-xl">No completed orders today</p>
          <p className="text-sm opacity-70">Completed orders will appear here</p>
        </div>
      )}
    </div>
  );

  const ManagerView = () => (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">Manager Dashboard</h2>
          <p className="text-gray-500">Overview of today's performance</p>
        </div>
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); updateState({ isManager: false, activeView: 'tables' }); }}
          className="flex items-center gap-2 bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 text-white px-6 py-3 rounded-xl font-medium transition-all transform hover:scale-105 shadow-lg"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Revenue', value: `₹${state.dailyStats.totalRevenue}`, icon: DollarSign, color: 'from-emerald-500 to-green-500' },
          { label: 'Total Orders', value: state.dailyStats.totalOrders, icon: BarChart3, color: 'from-blue-500 to-indigo-500' },
          { label: 'Average Order', value: `₹${state.dailyStats.avgOrderValue}`, icon: TrendingUp, color: 'from-purple-500 to-pink-500' },
          { label: 'Active Tables', value: Object.values(state.tables).filter(t => t.status !== 'available').length, icon: Users, color: 'from-amber-500 to-orange-500' }
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-white/20 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{label}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
              </div>
              <div className={`p-3 bg-gradient-to-r ${color} rounded-xl shadow-lg`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl p-8 border border-white/20">
          <h3 className="text-xl font-bold mb-6 text-gray-800">Popular Items Today</h3>
          <div className="space-y-4">
            {Object.entries(state.dailyStats.popularItems || {})
              .sort(([,a], [,b]) => b - a)
              .slice(0, 5)
              .map(([itemId, count]) => {
                const item = state.menuItems.find(i => i.id === parseInt(itemId));
                return item ? (
                  <div key={itemId} className="flex justify-between items-center p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl shadow-sm border border-gray-100">
                    <div>
                      <div className="font-semibold text-gray-900">{item.name}</div>
                      <div className="text-sm text-gray-600">₹{item.price}</div>
                    </div>
                    <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-3 py-1 rounded-lg text-sm font-bold">
                      {count} sold
                    </div>
                  </div>
                ) : null;
              })}
            {Object.keys(state.dailyStats.popularItems || {}).length === 0 && (
              <p className="text-gray-500 text-center py-8 opacity-70">No items sold today</p>
            )}
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl p-8 border border-white/20">
          <h3 className="text-xl font-bold mb-6 text-gray-800">Table Status Overview</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { status: 'available', label: 'Available', color: 'from-emerald-50 to-teal-50 border-emerald-200/50 text-emerald-700' },
              { status: 'occupied', label: 'Occupied', color: 'from-amber-50 to-orange-50 border-amber-200/50 text-amber-700' },
              { status: 'billed', label: 'Billed', color: 'from-rose-50 to-pink-50 border-rose-200/50 text-rose-700' },
              { status: 'paid', label: 'Paid', color: 'from-blue-50 to-indigo-50 border-blue-200/50 text-blue-700' }
            ].map(({ status, label, color }) => {
              const count = Object.values(state.tables).filter(t => t.status === status).length;
              return (
                <div key={status} className={`p-4 rounded-xl border-2 bg-gradient-to-br ${color} text-center`}>
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-sm font-medium">{label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl p-8 border border-white/20">
        <h3 className="text-xl font-bold mb-6 text-gray-800">Recent Activity</h3>
        <div className="space-y-4 max-h-80 overflow-y-auto">
          {state.dailyStats.completedOrders?.slice(-10).reverse().map((order, index) => (
            <div key={index} className="flex justify-between items-center p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl shadow-sm border border-gray-100">
              <div>
                <div className="font-semibold text-gray-900">Table {order.tableId}</div>
                <div className="text-sm text-gray-600">
                  {Object.entries(order.orders).map(([itemId, quantity]) => {
                    const item = state.menuItems.find(i => i.id === parseInt(itemId));
                    return item ? `${item.name} ×${quantity}` : '';
                  }).join(', ')}
                </div>
                <div className="text-xs text-gray-500">{order.payTime}</div>
              </div>
              <div className="text-lg font-bold text-gray-900">₹{order.total}</div>
            </div>
          ))}
          {(!state.dailyStats.completedOrders || state.dailyStats.completedOrders.length === 0) && (
            <p className="text-gray-500 text-center py-8 opacity-70">No recent orders</p>
          )}
        </div>
      </div>
    </div>
  );

  // Error Display
  if (state.error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-pink-50 to-rose-50 flex items-center justify-center p-4">
        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl w-full max-w-md border border-white/20 animate-pulse">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <X className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Connection Error</h2>
            <p className="text-gray-600 mb-6">{state.error}</p>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                updateState({ error: '' });
                fetchAllData();
              }}
              className="w-full bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white py-3 rounded-xl font-medium transition-all transform hover:scale-105"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main Render
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Header />
      
      <main className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          {state.activeView === 'manager-login' && <ManagerLogin />}
          {state.activeView === 'tables' && <TablesView />}
          {state.activeView === 'orders' && <OrdersView />}
          {state.activeView === 'billing' && <BillingView />}
          {state.activeView === 'history' && state.isManager && <HistoryView />}
          {state.activeView === 'manager' && state.isManager && <ManagerView />}
        </div>
      </main>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default RestaurantPOS;