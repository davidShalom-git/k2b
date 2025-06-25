import React, { useState, useEffect } from 'react';
import { ChefHat, Users, Receipt, Settings, Plus, Minus, Trash2, Printer, Edit2, Save, X, RefreshCw, DollarSign, CheckCircle } from 'lucide-react';

const API_BASE_URL = 'https://k2bhotel.vercel.app/api/hotel';

const RestaurantBillingSystem = () => {
  // State
  const [view, setView] = useState('tables');
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState({ username: '', password: '' });
  const [selectedTable, setSelectedTable] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [tables, setTables] = useState([]);
  const [bills, setBills] = useState([]);
  const [settings, setSettings] = useState({ gstRate: 18, restaurantName: 'My Restaurant' });
  const [stats, setStats] = useState({ todayRevenue: 0, todayOrders: 0, tableStats: { available: 0, occupied: 0, billed: 0 }, recentBills: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [newItem, setNewItem] = useState({ name: '', price: '', category: '' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [tempSettings, setTempSettings] = useState(settings);
useEffect(() => { setTempSettings(settings); }, [settings]);

  // API Utility
  const apiCall = async (endpoint, options = {}) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: { 'Content-Type': 'application/json', ...(token && endpoint.includes('/manager/') && { Authorization: `Bearer ${token}` }), ...options.headers },
        ...options,
      });
      if (!response.ok) throw new Error((await response.json()).error || 'API request failed');
      setError('');
      setLoading(false);
      return response.json();
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  // Data Fetching
  const fetchData = async () => {
    try {
      const [menu, tables, settings, stats, bills] = await Promise.all([
        apiCall('/menu/all'),
        apiCall('/tables'),
        apiCall('/settings'),
        apiCall('/dashboard/stats'),
        apiCall('/bills'),
      ]);
      setMenuItems(menu);
      setTables(tables);
      setSettings(settings);
      setStats(stats);
      setBills(bills.bills || []);
    } catch (err) {
      console.error('Data fetch failed:', err);
    }
  };

  // Manager Dashboard Fetching
  const fetchManagerStats = async () => {
    try {
      const data = await apiCall('/manager/dashboard/stats');
      setStats(data);
    } catch (err) {
      console.error('Manager stats fetch failed:', err);
      setView('login');
      setToken('');
      localStorage.removeItem('token');
    }
  };

  // Initial Load and Auto-Refresh
  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      if (view === 'tables') fetchData();
      if (view === 'dashboard' && token) fetchManagerStats();
    }, 30000);
    return () => clearInterval(interval);
  }, [view, token]);

  // Authentication
  const login = async () => {
    try {
      const { token } = await apiCall('/manager/login', { method: 'POST', body: JSON.stringify(user) });
      setToken(token);
      localStorage.setItem('token', token);
      setView('dashboard');
      setUser({ username: '', password: '' });
      fetchManagerStats();
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  const logout = () => {
    setToken('');
    localStorage.removeItem('token');
    setView('tables');
    fetchData();
  };

  // Menu Management
  const addMenuItem = async () => {
    if (!newItem.name || !newItem.price || !newItem.category) return setError('All fields required');
    try {
      await apiCall('/menu', { method: 'POST', body: JSON.stringify({ ...newItem, price: parseFloat(newItem.price) }) });
      setNewItem({ name: '', price: '', category: '' });
      setShowAddForm(false);
      fetchData();
    } catch (err) {
      console.error('Add menu item failed:', err);
    }
  };

  const updateMenuItem = async (id, item) => {
    try {
      await apiCall(`/menu/${id}`, { method: 'PUT', body: JSON.stringify(item) });
      setEditingItem(null);
      fetchData();
    } catch (err) {
      console.error('Update menu item failed:', err);
    }
  };

  const deleteMenuItem = async (id) => {
    try {
      await apiCall(`/menu/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      console.error('Delete menu item failed:', err);
    }
  };

  // Table Management
  const addItemToTable = async (tableNumber, menuItemId, quantity = 1) => {
    try {
      await apiCall(`/tables/${tableNumber}/orders`, { method: 'POST', body: JSON.stringify({ menuItemId, quantity }) });
      const tables = await apiCall('/tables');
      setTables(tables);
      setSelectedTable(tables.find((t) => t.tableNumber === tableNumber));
    } catch (err) {
      console.error('Add item to table failed:', err);
    }
  };

  const updateOrderQuantity = async (tableNumber, orderIndex, quantity) => {
    try {
      await apiCall(`/tables/${tableNumber}/orders/${orderIndex}`, { method: 'PUT', body: JSON.stringify({ quantity }) });
      const tables = await apiCall('/tables');
      setTables(tables);
      setSelectedTable(tables.find((t) => t.tableNumber === tableNumber));
    } catch (err) {
      console.error('Update order quantity failed:', err);
    }
  };

  const generateBill = async (tableNumber) => {
    try {
      const { bill } = await apiCall(`/tables/${tableNumber}/bill`, { method: 'POST' });
      setSelectedBill(bill);
      fetchData();
    } catch (err) {
      console.error('Generate bill failed:', err);
    }
  };

  const clearTable = async (tableNumber) => {
    try {
      await apiCall(`/tables/${tableNumber}/clear`, { method: 'POST' });
      setSelectedTable(null);
      fetchData();
    } catch (err) {
      console.error('Clear table failed:', err);
    }
  };

  // Settings Management
  const updateSettings = async (newSettings) => {
    try {
      await apiCall('/settings', { method: 'PUT', body: JSON.stringify(newSettings) });
      setSettings(newSettings);
    } catch (err) {
      console.error('Update settings failed:', err);
    }
  };

  // Utilities
  const getTableStatusColor = (status) =>
    ({
      available: 'bg-green-100 text-green-800 border-green-200',
      occupied: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      billed: 'bg-blue-100 text-blue-800 border-blue-200',
    }[status] || 'bg-gray-100 text-gray-800 border-gray-200');

  const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

  // Reusable Components
  const Modal = ({ children, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">{children}</div>
    </div>
  );

  const Button = ({ children, className, ...props }) => (
    <button className={`px-4 py-2 rounded-lg ${className}`} {...props}>
      {children}
    </button>
  );

  const Input = ({ label, ...props }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500" {...props} />
    </div>
  );

  // Render Views
  const renderLogin = () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Manager Login</h2>
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded flex justify-between">
            {error}
            <Button onClick={() => setError('')}><X className="w-4 h-4" /></Button>
          </div>
        )}
        <Input
          label="Username"
          value={user.username}
          onChange={(e) => setUser({ ...user, username: e.target.value })}
          placeholder="admin"
        />
        <Input
          label="Password"
          type="password"
          value={user.password}
          onChange={(e) => setUser({ ...user, password: e.target.value })}
          placeholder="admin123"
          className="mt-4"
        />
        <Button onClick={login} className="mt-6 w-full bg-blue-600 text-white hover:bg-blue-700">Login</Button>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h2 className="text-2xl font-bold">Manager Dashboard</h2>
        <Button onClick={fetchManagerStats} className="flex items-center bg-blue-600 text-white hover:bg-blue-700">
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { icon: DollarSign, label: "Today's Revenue", value: formatCurrency(stats.todayRevenue) },
          { icon: Receipt, label: "Today's Orders", value: stats.todayOrders },
          { icon: Users, label: 'Occupied Tables', value: stats.tableStats.occupied },
          { icon: CheckCircle, label: 'Available Tables', value: stats.tableStats.available },
        ].map(({ icon: Icon, label, value }, i) => (
          <div key={i} className="bg-white p-4 rounded shadow border flex items-center">
            <Icon className="w-8 h-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm text-gray-600">{label}</p>
              <p className="text-lg font-bold">{value}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded shadow border">
        <h3 className="p-4 text-lg font-semibold border-b">Recent Bills</h3>
        <div className="p-4">
          {stats.recentBills.length ? (
            stats.recentBills.map((bill) => (
              <div key={bill._id} className="flex justify-between p-3 bg-gray-50 rounded mb-2">
                <div>
                  <p className="font-medium">{bill.billNumber}</p>
                  <p className="text-sm text-gray-600">Table {bill.tableNumber}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatCurrency(bill.totalAmount)}</p>
                  <p className="text-sm text-gray-600">{new Date(bill.createdAt).toLocaleTimeString()}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500">No recent bills</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderTables = () => (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h2 className="text-2xl font-bold">Tables</h2>
        <Button onClick={fetchData} className="flex items-center bg-blue-600 text-white hover:bg-blue-700">
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {tables.map((table) => (
          <Button
            key={table.tableNumber}
            onClick={() => setSelectedTable(table)}
            className={`p-4 border-2 ${getTableStatusColor(table.status)} hover:shadow-md`}
          >
            <div className="text-center">
              <p className="font-bold text-lg">T{table.tableNumber}</p>
              {table.isAC && <p className="text-xs">AC</p>}
              <p className="text-xs capitalize">{table.status}</p>
              {table.subtotal > 0 && <p className="text-xs font-medium">{formatCurrency(table.subtotal)}</p>}
            </div>
          </Button>
        ))}
      </div>
      {selectedTable && (
        <Modal onClose={() => setSelectedTable(null)}>
          <div className="p-6 border-b flex justify-between">
            <h3 className="text-xl font-bold">Table {selectedTable.tableNumber} {selectedTable.isAC && '(AC)'}</h3>
            <Button onClick={() => setSelectedTable(null)} className="text-gray-500 hover:text-gray-700"><X className="w-6 h-6" /></Button>
          </div>
          <div className="p-6 space-y-5">
            {selectedTable.orders?.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold mb-2">Orders</h4>
                {selectedTable.orders.map((order, i) => (
                  <div key={i} className="flex justify-between items-center p-3 bg-gray-100 rounded-lg mb-4">
                    <div>
                      <p className="font-medium">{order.name}</p>
                      <p className="text-sm text-gray-600">{formatCurrency(order.price)} each</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateOrderQuantity(selectedTable.tableNumber, i, order.quantity - 1)}
                        className="px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200">
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="mx-2">{order.quantity}</span>
                      <button
                        onClick={() => updateOrderQuantity(selectedTable.tableNumber, i, order.quantity + 1)}
                        className="px-2 py-1 bg-green-100 text-green-600 rounded hover:bg-green-200">
                        <Plus className="w-4 h-4" />
                      </button>
                      <span className="ml-4 font-bold">{formatCurrency(order.amount)}</span>
                    </div>
                  </div>
                ))}
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <div className="flex justify-between">
                    <span className="text-lg font-semibold">Subtotal:</span>
                    <span className="text-lg font-bold">{formatCurrency(selectedTable.subtotal)}</span>
                  </div>
                </div>
              </div>
            )}
            <div>
              <h4 className="text-lg font-semibold mb-2">Add Items</h4>
              <div className="grid grid-cols-2 gap-4 max-h-60 overflow-y-auto">
                {menuItems.map((item) => (
                  <div key={item._id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-sm text-gray-600">{item.category}</p>
                      <p className="text-sm font-bold">{formatCurrency(item.price)}</p>
                    </div>
                    <button
                      onClick={() => addItemToTable(selectedTable.tableNumber, item._id)}
                      className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            {selectedTable.orders?.length > 0 && (
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => generateBill(selectedTable.tableNumber)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                  Generate Bill
                </button>
                <button
                  onClick={() => clearTable(selectedTable.tableNumber)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                  Clear Table
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );

  const renderMenu = () => (
  <div className="space-y-6">
    <div className="flex justify-between">
      <h2 className="text-2xl font-bold">Menu Management</h2>
      <button
        onClick={() => setShowAddForm(!showAddForm)}
        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
        <Plus className="w-4 h-4 mr-2" />Add Item
      </button>
    </div>
    {showAddForm && (
      <div className="bg-white p-6 rounded-lg shadow border">
        <h3 className="text-lg font-semibold mb-4">Add Menu Item</h3>
        <div className="grid grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Name"
            value={newItem.name}
            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
            className="p-2 border rounded focus:ring-2 focus:ring-blue-500" />
          <input 
          type="number"
            placeholder="Price"
            value={newItem.price}
            onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
            className="p-2 border rounded focus:ring-2 focus:ring-blue-500" />
          <input
            type="text"
            placeholder="Category"
            value={newItem.category}
            onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
            className="p-2 border rounded focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex justify-end space-x-4 mt-4">
          <button
            onClick={() => setShowAddForm(false)}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300">
            Cancel
             </button>
          <button
            onClick={addMenuItem}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Add
          </button>
        </div>
      </div>
    )}
    <div className="bg-white p-6 rounded-lg shadow border">
      <div className="grid grid-cols-3 gap-4">
        {menuItems.map((item) => (
          <div key={item._id} className="border rounded-lg p-4">
            {editingItem === item._id ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => setMenuItems(menuItems.map((m) => m._id === item._id ? { ...m, name: e.target.value } : m))}
                  className="p-2 border rounded w-full" />
                <input
                  type="number"
                  value={item.price}
                  onChange={(e) => setMenuItems(menuItems.map((m) => m._id === item._id ? { ...m, price: parseFloat(e.target.value) } : m ))}
                  className="p-2 border rounded w-full" />
                <input
                  type="text"
                  value={item.category}
                  onChange={(e) => setMenuItems(menuItems.map((m) => m._id === item._id ? { ...m, category: e.target.value } : m ))}
                  className="p-2 border rounded w-full" />
                <div className="flex space-x-2">
                  <button
                    onClick={() => updateMenuItem(item._id, item)}
                    className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700">
                      <Save className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditingItem(null)}
                    className="p-2 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : ( 
              <div className="flex justify-between">
                <div>
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-sm text-gray-600">{item.category}</p>
                  <p className="text-sm font-bold text-green-700">{formatCurrency(item.price)}</p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setEditingItem(item._id)}
                    className="p-1 text-blue-600 hover:bg-blue-100 rounded">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteMenuItem(item._id)}
                    className="p-1 text-red-600 hover:bg-red-100 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  </div>
);

  const renderBills = () => (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h2 className="text-2xl font-bold">Bills</h2>
        <button
          onClick={() => fetchData()}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            <RefreshCw className="w-4 h-4 mr-2" />Refresh
          </button>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border">
          {bills.map((bill) => (
            <div key={bill._id} className="flex justify-between items-center p-4 border rounded-lg mb-4 hover:bg-gray-50">
              <div>
                <p className="font-bold">{bill.billNumber}</p>
                <p className="text-sm text-gray-500">Table {bill.tableNumber}</p>
                <p className="text-sm text-gray-500">{new Date(bill.createdAt).toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="font-bold">{formatCurrency(bill.totalAmount)}</p>
                <p className="text-sm text-gray-500">GST: {formatCurrency(bill.gstAmount)}</p>
                <button
                  onClick={() => setSelectedBill(bill)}
                  className="mt-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
                View
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

 const renderSettings = () => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold">Settings</h2>
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Restaurant Info</h3>
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Restaurant Name</label>
          <input
            type="text"
            value={tempSettings.restaurantName || ''}
            onChange={(e) => setTempSettings({ ...tempSettings, restaurantName: e.target.value })}
            className="p-2 border rounded w-full focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Address</label>
          <textarea
            value={tempSettings.address || ''}
            onChange={(e) => setTempSettings({ ...tempSettings, address: e.target.value })}
            className="p-2 border rounded w-full focus:ring-2 focus:ring-blue-500"
            rows="3" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Phone</label>
          <input
           type="text"
            value={tempSettings.phone || ''}
            onChange={(e) => setTempSettings({ ...tempSettings, phone: e.target.value })}
            className="p-2 border rounded w-full focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">GST Rate (%)</label>
          <input
            type="number"
            value={tempSettings.gstRate || 18}
            onChange={(e) => setTempSettings({ ...tempSettings, gstRate: parseFloat(e.target.value) })}
            className="p-2 border rounded w-full focus:ring-2 focus:ring-blue-500" />
        </div>
        <button
          onClick={() => updateSettings(tempSettings)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
        Save
        </button>
      </div>
    </div>
     </div>
);


  const BillModal = ({ bill, onClose }) => (
    <Modal onClose={onClose}>
      <div className="p-6 border-b flex justify-between">
        <h3 className="text-xl font-bold">Bill Details</h3>
        <button onClick={onClose} className="text-gray-500 hover:bg-gray-100">
          <X className="w-6 h-6" />
        </button>
      </div>
      <div className="p-6 space-y-4">
        <div className="text-center border-b pb-2">
          <h2 className="text-xl font-bold">{settings.restaurantName}</h2>
          <p className="text-gray-600">{settings.address}</p>
          <p className="text-gray-600">{settings.phone}</p>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p><b>Bill Number:</b> {bill.billNumber}</p>
            <p><b>Table:</b> {bill.tableNumber}</p>
          </div>
          <div className="text-right">
            <p><b>Date:</b> {new Date(bill.createdAt).toLocaleDateString()}</p>
            <p><b>Time:</b> {new Date(bill.createdAt).toLocaleTimeString()}</p>
          </div>
        </div>
        <div>
          <h4 className="font-semibold mb-2">Items</h4>
          {bill.orders.map((order, i) => (
            <div key={i} className="flex justify-between">
              <span>{order.name} <span className="text-gray-600">x{order.quantity}</span></span>
              <span>{formatCurrency(order.amount)}</span>
            </div>
          ))}
        </div>
        <div className="border-t pt-2 space-y-2">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatCurrency(bill.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>GST ({bill.gstRate}%)</span>
            <span>{formatCurrency(bill.gstAmount)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span>{formatCurrency(bill.totalAmount)}</span>
          </div>
        </div>
        <div className="flex justify-center space-x-4 pt-4">
          <button
            onClick={() => window.print()}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            <Printer className="w-4 h-4 mr-2" />Print
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300">
          Close
          </button>
        </div>
      </div>
    </Modal>
  );

  // Main Render
  if (view === 'login') return renderLogin();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-100"><RefreshCw className="w-8 h-8 animate-spin text-blue-600" />Loading...</div>;

  const navigation = [
    { id: 'dashboard', name: 'Manager Dashboard', icon: DollarSign, protected: true },
    { id: 'tables', name: 'Tables', icon: Users },
    { id: 'menu', name: 'Menu', icon: ChefHat },
    { id: 'bills', name: 'Bills', icon: Receipt },
    { id: 'settings', name: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <ChefHat className="w-8 h-8 text-blue-600" />
            <h1 className="ml-2 text-2xl font-bold">{settings.restaurantName || 'Restaurant POS'}</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-gray-600">Today's Revenue</p>
              <p className="font-bold text-green-600">{formatCurrency(stats.todayRevenue)}</p>
            </div>
            {token && (
              <button
                onClick={logout}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                Logout
              </button>
            )}
          </div>
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col lg:flex-row gap-8">
        <nav className="lg:w-64 bg-white p-4 rounded-lg shadow">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => !item.protected || token ? setView(item.id) : setView('login')}
                className={`w-full flex items-center px-4 py-3 rounded mb-2 ${
                  view === item.id ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-5 h-5 mr-3" />{item.name}
              </button>
            );
          })}
        </nav>
        <div className="flex-1">
          {error && (
            <div className="p-4 bg-red-100 text-red-700 rounded flex justify-between mb-4">
              {error}
              <button onClick={() => setError('')}><X className="w-4 h-4" /></button>
            </div>
          )}
          {view === 'dashboard' && renderDashboard()}
          {view === 'tables' && renderTables()}
          {view === 'menu' && renderMenu()}
          {view === 'bills' && renderBills()}
          {view === 'settings' && renderSettings()}
        </div>
      </div>
      {selectedBill && <BillModal bill={selectedBill} onClose={() => setSelectedBill(null)} />}
    </div>
  );
};

export default RestaurantBillingSystem;