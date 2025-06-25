import React, { useState, useEffect } from 'react';
import { ChefHat, Users, Receipt, Settings, Plus, Minus, Trash2, Download, Printer, Edit2, Save, X, RefreshCw, DollarSign, Clock, CheckCircle } from 'lucide-react';

const API_BASE_URL = 'https://k2bhotel.vercel.app/api';

const RestaurantBillingSystem = () => {
  // State Management
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedTable, setSelectedTable] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [tables, setTables] = useState([]);
  const [bills, setBills] = useState([]);
  const [settings, setSettings] = useState({ gstRate: 18, restaurantName: 'My Restaurant' });
  const [dashboardStats, setDashboardStats] = useState({
    todayRevenue: 0,
    todayOrders: 0,
    tableStats: { available: 0, occupied: 0, billed: 0 },
    recentBills: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [newItem, setNewItem] = useState({ name: '', price: '', category: '' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);

  // API Helper Functions
  const apiCall = async (endpoint, options = {}) => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'API request failed');
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      setError(error.message);
      throw error;
    }
  };

  // Data Fetching Functions
  const fetchMenuItems = async () => {
    try {
      const data = await apiCall('/menu');
      setMenuItems(data);
    } catch (error) {
      console.error('Failed to fetch menu items:', error);
    }
  };

  const fetchTables = async () => {
    try {
      const data = await apiCall('/tables');
      setTables(data);
    } catch (error) {
      console.error('Failed to fetch tables:', error);
    }
  };

  const fetchBills = async () => {
    try {
      const data = await apiCall('/bills');
      setBills(data.bills || []);
    } catch (error) {
      console.error('Failed to fetch bills:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      const data = await apiCall('/settings');
      if (data) setSettings(data);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const data = await apiCall('/dashboard/stats');
      setDashboardStats(data);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    }
  };

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      await Promise.all([
        fetchMenuItems(),
        fetchTables(),
        fetchSettings(),
        fetchDashboardStats(),
        fetchBills()
      ]);
      setLoading(false);
    };
    
    loadInitialData();
  }, []);

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentView === 'dashboard') {
        fetchDashboardStats();
        fetchTables();
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [currentView]);

  // Menu Management Functions
  const addMenuItem = async () => {
    if (!newItem.name || !newItem.price || !newItem.category) {
      setError('Please fill all fields');
      return;
    }
    
    try {
      await apiCall('/menu', {
        method: 'POST',
        body: JSON.stringify({
          name: newItem.name,
          price: parseFloat(newItem.price),
          category: newItem.category
        })
      });
      
      setNewItem({ name: '', price: '', category: '' });
      setShowAddForm(false);
      await fetchMenuItems();
      setError('');
    } catch (error) {
      console.error('Failed to add menu item:', error);
    }
  };

  const updateMenuItem = async (id, updatedItem) => {
    try {
      await apiCall(`/menu/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updatedItem)
      });
      
      setEditingItem(null);
      await fetchMenuItems();
    } catch (error) {
      console.error('Failed to update menu item:', error);
    }
  };

  const deleteMenuItem = async (id) => {
    try {
      await apiCall(`/menu/${id}`, { method: 'DELETE' });
      await fetchMenuItems();
    } catch (error) {
      console.error('Failed to delete menu item:', error);
    }
  };

  // Table Management Functions
  const addItemToTable = async (tableNumber, menuItemId, quantity = 1) => {
    try {
      await apiCall(`/tables/${tableNumber}/orders`, {
        method: 'POST',
        body: JSON.stringify({ menuItemId, quantity })
      });
      
      await fetchTables();
      const updatedTable = tables.find(t => t.tableNumber === tableNumber);
      setSelectedTable(updatedTable);
    } catch (error) {
      console.error('Failed to add item to table:', error);
    }
  };

  const updateOrderQuantity = async (tableNumber, orderIndex, quantity) => {
    try {
      await apiCall(`/tables/${tableNumber}/orders/${orderIndex}`, {
        method: 'PUT',
        body: JSON.stringify({ quantity })
      });
      
      await fetchTables();
      const updatedTable = tables.find(t => t.tableNumber === tableNumber);
      setSelectedTable(updatedTable);
    } catch (error) {
      console.error('Failed to update order quantity:', error);
    }
  };

  const generateBill = async (tableNumber) => {
    try {
      const result = await apiCall(`/tables/${tableNumber}/bill`, {
        method: 'POST'
      });
      
      setSelectedBill(result.bill);
      await fetchTables();
      await fetchDashboardStats();
      await fetchBills();
    } catch (error) {
      console.error('Failed to generate bill:', error);
    }
  };

  const clearTable = async (tableNumber) => {
    try {
      await apiCall(`/tables/${tableNumber}/clear`, {
        method: 'POST'
      });
      
      await fetchTables();
      setSelectedTable(null);
    } catch (error) {
      console.error('Failed to clear table:', error);
    }
  };

  // Settings Management
  const updateSettings = async (newSettings) => {
    try {
      await apiCall('/settings', {
        method: 'PUT',
        body: JSON.stringify(newSettings)
      });
      
      setSettings(newSettings);
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  };

  // Utility Functions
  const getTableStatusColor = (status) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800 border-green-200';
      case 'occupied': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'billed': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  // Component Renderers
  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <button
          onClick={() => fetchDashboardStats()}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <DollarSign className="w-8 h-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Today's Revenue</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(dashboardStats.todayRevenue)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <Receipt className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Today's Orders</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardStats.todayOrders}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Occupied Tables</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardStats.tableStats.occupied}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Available Tables</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardStats.tableStats.available}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Bills */}
      <div className="bg-white rounded-lg shadow border">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Recent Bills</h3>
        </div>
        <div className="p-6">
          {dashboardStats.recentBills && dashboardStats.recentBills.length > 0 ? (
            <div className="space-y-4">
              {dashboardStats.recentBills.map((bill) => (
                <div key={bill._id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{bill.billNumber}</p>
                    <p className="text-sm text-gray-600">Table {bill.tableNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(bill.totalAmount)}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(bill.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No recent bills</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderTables = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Tables</h2>
        <button
          onClick={() => fetchTables()}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {tables.map((table) => (
          <button
            key={table.tableNumber}
            onClick={() => setSelectedTable(table)}
            className={`p-4 rounded-lg border-2 transition-all ${getTableStatusColor(table.status)} hover:shadow-md`}
          >
            <div className="text-center">
              <p className="font-bold text-lg">T{table.tableNumber}</p>
              {table.isAC && <p className="text-xs">AC</p>}
              <p className="text-xs capitalize mt-1">{table.status}</p>
              {table.subtotal > 0 && (
                <p className="text-xs font-medium mt-1">{formatCurrency(table.subtotal)}</p>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Table Detail Modal */}
      {selectedTable && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">
                  Table {selectedTable.tableNumber} {selectedTable.isAC && '(AC)'}
                </h3>
                <button
                  onClick={() => setSelectedTable(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Current Orders */}
              {selectedTable.orders && selectedTable.orders.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold mb-4">Current Orders</h4>
                  <div className="space-y-2">
                    {selectedTable.orders.map((order, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{order.name}</p>
                          <p className="text-sm text-gray-600">{formatCurrency(order.price)} each</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => updateOrderQuantity(selectedTable.tableNumber, index, order.quantity - 1)}
                            className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="mx-2 font-medium">{order.quantity}</span>
                          <button
                            onClick={() => updateOrderQuantity(selectedTable.tableNumber, index, order.quantity + 1)}
                            className="p-1 bg-green-100 text-green-600 rounded hover:bg-green-200"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <span className="ml-4 font-bold">{formatCurrency(order.amount)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <div className="flex justify-between">
                      <span className="text-lg font-semibold">Subtotal:</span>
                      <span className="text-lg font-bold">{formatCurrency(selectedTable.subtotal)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Menu Items */}
              <div>
                <h4 className="text-lg font-semibold mb-4">Add Items</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-60 overflow-y-auto">
                  {menuItems.map((item) => (
                    <div key={item._id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-gray-600">{item.category}</p>
                        <p className="text-sm font-bold">{formatCurrency(item.price)}</p>
                      </div>
                      <button
                        onClick={() => addItemToTable(selectedTable.tableNumber, item._id)}
                        className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-4">
                {selectedTable.orders && selectedTable.orders.length > 0 && (
                  <>
                    <button
                      onClick={() => generateBill(selectedTable.tableNumber)}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Generate Bill
                    </button>
                    <button
                      onClick={() => clearTable(selectedTable.tableNumber)}
                      className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      Clear Table
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderMenu = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Menu Management</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </button>
      </div>

      {/* Add Item Form */}
      {showAddForm && (
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-semibold mb-4">Add New Menu Item</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Item Name"
              value={newItem.name}
              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              className="p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              placeholder="Price"
              value={newItem.price}
              onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
              className="p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Category"
              value={newItem.category}
              onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
              className="p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end space-x-4 mt-4">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              onClick={addMenuItem}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Add Item
            </button>
          </div>
        </div>
      )}

      {/* Menu Items List */}
      <div className="bg-white rounded-lg shadow border">
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {menuItems.map((item) => (
              <div key={item._id} className="border rounded-lg p-4">
                {editingItem === item._id ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => {
                        const updatedItems = menuItems.map(mi => 
                          mi._id === item._id ? { ...mi, name: e.target.value } : mi
                        );
                        setMenuItems(updatedItems);
                      }}
                      className="w-full p-2 border rounded"
                    />
                    <input
                      type="number"
                      value={item.price}
                      onChange={(e) => {
                        const updatedItems = menuItems.map(mi => 
                          mi._id === item._id ? { ...mi, price: parseFloat(e.target.value) } : mi
                        );
                        setMenuItems(updatedItems);
                      }}
                      className="w-full p-2 border rounded"
                    />
                    <input
                      type="text"
                      value={item.category}
                      onChange={(e) => {
                        const updatedItems = menuItems.map(mi => 
                          mi._id === item._id ? { ...mi, category: e.target.value } : mi
                        );
                        setMenuItems(updatedItems);
                      }}
                      className="w-full p-2 border rounded"
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={() => updateMenuItem(item._id, item)}
                        className="p-2 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingItem(null)}
                        className="p-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold">{item.name}</h4>
                        <p className="text-sm text-gray-600">{item.category}</p>
                        <p className="text-lg font-bold text-green-600">{formatCurrency(item.price)}</p>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => setEditingItem(item._id)}
                          className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteMenuItem(item._id)}
                          className="p-1 text-red-600 hover:bg-red-100 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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

  const renderBills = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Bills</h2>
        <button
          onClick={() => fetchBills()}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-lg shadow border">
        <div className="p-6">
          <div className="space-y-4">
            {bills.map((bill) => (
              <div key={bill._id} className="flex justify-between items-center p-4 border rounded-lg hover:bg-gray-50">
                <div>
                  <p className="font-bold">{bill.billNumber}</p>
                  <p className="text-sm text-gray-600">Table {bill.tableNumber}</p>
                  <p className="text-sm text-gray-600">
                    {new Date(bill.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold">{formatCurrency(bill.totalAmount)}</p>
                  <p className="text-sm text-gray-600">GST: {formatCurrency(bill.gstAmount)}</p>
                  <button
                    onClick={() => setSelectedBill(bill)}
                    className="mt-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderSettings = () => {
    const [tempSettings, setTempSettings] = useState(settings);

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>

        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-semibold mb-4">Restaurant Information</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Restaurant Name</label>
              <input
                type="text"
                value={tempSettings.restaurantName || ''}
                onChange={(e) => setTempSettings({ ...tempSettings, restaurantName: e.target.value })}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
              <textarea
                value={tempSettings.address || ''}
                onChange={(e) => setTempSettings({ ...tempSettings, address: e.target.value })}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                rows="3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
              <input
                type="text"
                value={tempSettings.phone || ''}
                onChange={(e) => setTempSettings({ ...tempSettings, phone: e.target.value })}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">GST Rate (%)</label>
              <input
                type="number"
                value={tempSettings.gstRate || 18}
                onChange={(e) => setTempSettings({ ...tempSettings, gstRate: parseFloat(e.target.value) })}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => updateSettings(tempSettings)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Bill Modal Component
  const BillModal = ({ bill, onClose }) => {
    if (!bill) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">Bill Details</h3>
              <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="text-center border-b pb-4">
              <h2 className="text-2xl font-bold">{settings.restaurantName}</h2>
              <p className="text-gray-600">{settings.address}</p>
              <p className="text-gray-600">{settings.phone}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p><span className="font-semibold">Bill Number:</span> {bill.billNumber}</p>
                <p><span className="font-semibold">Table:</span> {bill.tableNumber}</p>
              </div>
              <div className="text-right">
                <p><span className="font-semibold">Date:</span> {new Date(bill.createdAt).toLocaleDateString()}</p>
                <p><span className="font-semibold">Time:</span> {new Date(bill.createdAt).toLocaleTimeString()}</p>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Items:</h4>
              <div className="space-y-2">
                {bill.orders.map((order, index) => (
                  <div key={index} className="flex justify-between">
                    <div>
                      <span>{order.name}</span>
                      <span className="text-gray-600 ml-2">x{order.quantity}</span>
                    </div>
                    <span>{formatCurrency(order.amount)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(bill.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>GST ({bill.gstRate}%):</span>
                <span>{formatCurrency(bill.gstAmount)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total:</span>
                <span>{formatCurrency(bill.totalAmount)}</span>
              </div>
            </div>

            <div className="flex justify-center space-x-4 pt-4">
              <button
                onClick={() => window.print()}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Main Navigation
  const navigation = [
    { id: 'dashboard', name: 'Dashboard', icon: DollarSign },
    { id: 'tables', name: 'Tables', icon: Users },
    { id: 'menu', name: 'Menu', icon: ChefHat },
    { id: 'bills', name: 'Bills', icon: Receipt },
    { id: 'settings', name: 'Settings', icon: Settings },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          <span className="text-xl">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <ChefHat className="w-8 h-8 text-blue-600" />
              <h1 className="ml-2 text-2xl font-bold text-gray-900">
                {settings.restaurantName || 'Restaurant POS'}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-600">Today's Revenue</p>
                <p className="font-bold text-green-600">{formatCurrency(dashboardStats.todayRevenue)}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:w-64">
            <nav className="bg-white rounded-lg shadow border p-4">
              <div className="space-y-2">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setCurrentView(item.id)}
                      className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                        currentView === item.id
                          ? 'bg-blue-100 text-blue-700 border border-blue-200'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-5 h-5 mr-3" />
                      {item.name}
                    </button>
                  );
                })}
              </div>
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {error && (
              <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                <div className="flex justify-between items-center">
                  <span>{error}</span>
                  <button
                    onClick={() => setError('')}
                    className="text-red-700 hover:text-red-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {currentView === 'dashboard' && renderDashboard()}
            {currentView === 'tables' && renderTables()}
            {currentView === 'menu' && renderMenu()}
            {currentView === 'bills' && renderBills()}
            {currentView === 'settings' && renderSettings()}
          </div>
        </div>
      </div>

      {/* Bill Modal */}
      {selectedBill && (
        <BillModal bill={selectedBill} onClose={() => setSelectedBill(null)} />
      )}
    </div>
  );
};

export default RestaurantBillingSystem;