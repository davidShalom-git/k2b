import React from 'react';
import { BarChart3, Package, Calendar, Clock, DollarSign, Utensils, TrendingUp, Users, Edit3, Save, Trash2, LogOut, Plus } from 'lucide-react';

const Manager = ({
  state,
  updateState,
  getCurrentPrice,
  getTableStatus,
  Button,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  setDailyPrice,
  menuItems,
  fetchAllData
}) => {
  const validateMenuItem = (item) => {
    if (!item.name.trim()) return 'Item name is required';
    if (!item.basePrice || item.basePrice <= 0) return 'Valid base price is required';
    if (!item.preparationTime || item.preparationTime <= 0) return 'Valid preparation time is required';
    return '';
  };

  const handleAddMenuItem = async () => {
    const error = validateMenuItem(state.newItem);
    if (error) {
      updateState({ menuError: error });
      return;
    }
    updateState({ loading: true, menuError: '' });
    try {
      await addMenuItem();
      updateState({ 
        showAddItem: false, 
        newItem: { name: '', basePrice: '', category: 'main', description: '', preparationTime: 15 },
        loading: false
      });
    } catch (err) {
      console.error('API Error:', err);
      updateState({ menuError: `Failed to add item: ${err.message || 'API Error'}`, loading: false });
    }
  };

  const handleUpdateMenuItem = async (id) => {
    const error = validateMenuItem(state.newItem);
    if (error) {
      updateState({ menuError: error });
      return;
    }
    updateState({ loading: true, menuError: '' });
    try {
      await updateMenuItem(id, state.newItem);
      updateState({ editingItem: null, newItem: { name: '', basePrice: '', category: 'main', description: '', preparationTime: 15 }, loading: false });
    } catch (err) {
      console.error('API Error:', err);
      updateState({ menuError: `Failed to update item: ${err.message || 'API Error'}`, loading: false });
    }
  };

  const MenuManagementView = () => (
    <div className="p-6 bg-gradient-to-br from-gray-100 to-blue-100 min-h-screen transition-all duration-300">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl p-8 mb-8 border border-gray-200">
          <h2 className="text-3xl font-extrabold text-gray-900 flex items-center gap-4">
            <Package className="w-8 h-8 text-blue-600" />
            Menu Management
          </h2>
          <p className="text-gray-600 mt-2 text-lg">Manage your restaurant's menu items and pricing</p>
        </div>

        {state.showAddItem && (
          <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl p-8 mb-8 border border-gray-200 animate-fade-in">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Add New Menu Item</h3>
            {state.menuError && (
              <div className="bg-red-50 border border-red-300 text-red-800 p-4 rounded-2xl mb-6 animate-pulse flex items-center justify-between">
                <span>{state.menuError}</span>
                {state.menuError.includes('Failed') && (
                  <Button
                    onClick={handleAddMenuItem}
                    className="ml-4 bg-blue-600 text-white rounded-xl px-4 py-2 hover:bg-blue-700 transition-all duration-200"
                    size="sm"
                  >
                    Try Again
                  </Button>
                )}
              </div>
            )}
            <div className="grid gap-6 sm:grid-cols-2">
              <input
                type="text"
                placeholder="Item Name"
                value={state.newItem.name}
                onChange={(e) => updateState({ newItem: { ...state.newItem, name: e.target.value } })}
                className="p-4 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-gray-50 transition-all duration-200"
              />
              <input
                type="number"
                placeholder="Base Price"
                value={state.newItem.basePrice}
                onChange={(e) => updateState({ newItem: { ...state.newItem, basePrice: e.target.value } })}
                min="0"
                step="0.01"
                className="p-4 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-gray-50 transition-all duration-200"
              />
              <select
                value={state.newItem.category}
                onChange={(e) => updateState({ newItem: { ...state.newItem, category: e.target.value } })}
                className="p-4 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-gray-50 transition-all duration-200"
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
                className="p-4 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-gray-50 transition-all duration-200"
              />
              <input
                type="number"
                placeholder="Preparation Time (minutes)"
                value={state.newItem.preparationTime}
                onChange={(e) => updateState({ newItem: { ...state.newItem, preparationTime: e.target.value } })}
                min="1"
                className="p-4 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-gray-50 transition-all duration-200"
              />
              <div className="flex gap-4 sm:col-span-2">
                <Button
                  onClick={handleAddMenuItem}
                  disabled={state.loading}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200"
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
                  className="flex-1 bg-gray-200 text-gray-800 rounded-2xl hover:bg-gray-300 transition-all duration-200"
                  size="lg"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl p-8 border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-gray-900">Menu Items</h3>
            <Button
              onClick={() => updateState({ showAddItem: true, activeView: 'menu-management' })}
              variant="primary"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Item
            </Button>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {menuItems.map(item => (
              <div key={item.id} className="p-6 bg-gray-50 rounded-2xl border border-gray-200 hover:shadow-md transition-all duration-200">
                {state.editingItem === item.id ? (
                  <div className="grid gap-4">
                    <input
                      type="text"
                      value={state.newItem.name}
                      onChange={(e) => updateState({ newItem: { ...state.newItem, name: e.target.value } })}
                      className="p-4 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-gray-50 transition-all duration-200"
                    />
                    <input
                      type="number"
                      value={state.newItem.basePrice}
                      onChange={(e) => updateState({ newItem: { ...state.newItem, basePrice: e.target.value } })}
                      min="0"
                      step="0.01"
                      className="p-4 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-gray-50 transition-all duration-200"
                    />
                    <select
                      value={state.newItem.category}
                      onChange={(e) => updateState({ newItem: { ...state.newItem, category: e.target.value } })}
                      className="p-4 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-gray-50 transition-all duration-200"
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
                      className="p-4 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-gray-50 transition-all duration-200"
                    />
                    <input
                      type="number"
                      value={state.newItem.preparationTime}
                      onChange={(e) => updateState({ newItem: { ...state.newItem, preparationTime: e.target.value } })}
                      min="1"
                      className="p-4 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-gray-50 transition-all duration-200"
                    />
                    <div className="flex gap-4">
                      <Button
                        onClick={() => handleUpdateMenuItem(item.id)}
                        disabled={state.loading}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200"
                        size="sm"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => updateState({ editingItem: null, newItem: { name: '', basePrice: '', category: 'main', description: '', preparationTime: 15 }, menuError: '' })}
                        className="flex-1 bg-gray-200 text-gray-800 rounded-2xl hover:bg-gray-300 transition-all duration-200"
                        size="sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-xl text-gray-900">{item.name}</h4>
                      <p className="text-2xl font-bold text-green-600">₹{getCurrentPrice(item)}</p>
                      <p className="text-sm text-gray-500 capitalize">{item.category}</p>
                      {item.description && <p className="text-sm text-gray-600 mt-1">{item.description}</p>}
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
                        className="bg-gray-200 text-gray-800 rounded-2xl hover:bg-gray-300 transition-all duration-200"
                        size="sm"
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => deleteMenuItem(item.id)}
                        className="bg-red-600 text-white rounded-2xl hover:bg-red-700 transition-all duration-200"
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
    <div className="p-6 bg-gradient-to-br from-gray-100 to-blue-100 min-h-screen transition-all duration-300">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl p-8 mb-8 border border-gray-200">
          <h2 className="text-3xl font-extrabold text-gray-900 flex items-center gap-4">
            <Calendar className="w-8 h-8 text-blue-600" />
            Daily Pricing
          </h2>
          <p className="text-gray-600 mt-2 text-lg">Adjust daily pricing for menu items</p>
        </div>
        <div className="mb-8">
          <input
            type="date"
            value={state.selectedDate}
            onChange={(e) => updateState({ selectedDate: e.target.value })}
            className="p-4 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-gray-50 transition-all duration-200 w-full max-w-xs"
          />
        </div>
        {state.menuError && (
          <div className="bg-red-50 border border-red-300 text-red-800 p-4 rounded-2xl mb-8 animate-pulse">
            {state.menuError}
          </div>
        )}
        <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl p-8 border border-gray-200">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">Menu Items Pricing</h3>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {menuItems.map(item => (
              <div key={item.id} className="p-6 bg-gray-50 rounded-2xl border border-gray-200 hover:shadow-md transition-all duration-200">
                {state.editingDailyPrice === item.id ? (
                  <div className="grid gap-4">
                    <div className="flex items-center gap-4">
                      <input
                        type="number"
                        placeholder="Daily Price"
                        value={state.newItem.basePrice}
                        onChange={(e) => updateState({ newItem: { ...state.newItem, basePrice: e.target.value } })}
                        min="0"
                        step="0.01"
                        className="p-4 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-gray-50 transition-all duration-200 flex-1"
                      />
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={state.newItem.isAvailable !== false}
                          onChange={(e) => updateState({ newItem: { ...state.newItem, isAvailable: e.target.checked } })}
                          className="w-5 h-5 accent-blue-600"
                        />
                        Available
                      </label>
                    </div>
                    <div className="flex gap-4">
                      <Button
                        onClick={() => {
                          if (!state.newItem.basePrice || state.newItem.basePrice <= 0) {
                            updateState({ menuError: 'Valid daily price is required' });
                            return;
                          }
                          setDailyPrice(
                            item.id, 
                            state.newItem.basePrice, 
                            state.newItem.isAvailable !== false
                          );
                        }}
                        disabled={state.loading}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200"
                        size="sm"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => updateState({ editingDailyPrice: null, newItem: { name: '', basePrice: '', category: 'main', description: '', preparationTime: 15 }, menuError: '' })}
                        className="flex-1 bg-gray-200 text-gray-800 rounded-2xl hover:bg-gray-300 transition-all duration-200"
                        size="sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-xl text-gray-900">{item.name}</h4>
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
                      className="bg-gray-200 text-gray-800 rounded-2xl hover:bg-gray-300 transition-all duration-200"
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

  const HistoryView = () => (
    <div className="p-6 bg-gradient-to-br from-gray-100 to-blue-100 min-h-screen transition-all duration-300">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl p-8 mb-8 border border-gray-200">
          <h2 className="text-3xl font-extrabold text-gray-900 flex items-center gap-4">
            <Clock className="w-8 h-8 text-blue-600" />
            Order History
          </h2>
          <p className="text-gray-600 mt-2 text-lg">View recent completed orders</p>
        </div>
        {state.dailyStats.completedOrders?.length > 0 ? (
          <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-100/70">
                  <tr>
                    {['Table', 'Items', 'Total', 'Order Time', 'Completed'].map(header => (
                      <th key={header} className="px-6 py-4 font-bold text-gray-900">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/50">
                  {state.dailyStats.completedOrders.slice(-20).reverse().map((order, index) => (
                    <tr key={index} className="hover:bg-gray-50/70 transition-colors duration-200">
                      <td className="px-6 py-4 font-bold text-gray-900">Table {order.tableId}</td>
                      <td className="px-6 py-4">
                        {Object.entries(order.orders).map(([itemId, qty]) => {
                          const item = menuItems.find(i => i.id === parseInt(itemId));
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
          <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl p-8 text-center border border-gray-200">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 font-medium text-lg">No completed orders today</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-6 bg-gradient-to-br from-gray-100 to-blue-100 min-h-screen transition-all duration-300">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl p-8 border border-gray-200">
            <h2 className="text-3xl font-extrabold text-gray-900 flex items-center gap-4">
              <BarChart3 className="w-8 h-8 text-blue-600" />
              Manager Dashboard
            </h2>
            <p className="text-gray-600 mt-2 text-lg">Business analytics and insights</p>
          </div>
          <Button 
            variant="danger" 
            onClick={() => updateState({ isManager: false, activeView: 'tables', managerToken: '' })}
            className="flex items-center gap-2 bg-red-600 text-white rounded-2xl hover:bg-red-700 transition-all duration-200"
            size="sm"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
        <div className="flex gap-4 mb-8 flex-wrap">
          {[
            { key: 'overview', label: 'Overview', icon: BarChart3 },
            { key: 'menu-management', label: 'Menu Management', icon: Package },
            { key: 'daily-pricing', label: 'Daily Pricing', icon: Calendar },
            { key: 'history', label: 'History', icon: Clock }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => updateState({ activeView: tab.key })}
              className={`px-6 py-3 text-sm rounded-2xl font-semibold transition-all duration-300 flex items-center gap-2 ${
                state.activeView === tab.key 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>
        {state.activeView === 'overview' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[
                { label: 'Total Revenue', value: `₹${state.dailyStats.totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'from-emerald-500 to-green-600' },
                { label: 'Total Orders', value: state.dailyStats.totalOrders.toLocaleString(), icon: Utensils, color: 'from-blue-500 to-indigo-600' },
                { label: 'Avg. Order Value', value: `₹${state.dailyStats.avgOrderValue.toLocaleString()}`, icon: TrendingUp, color: 'from-purple-500 to-pink-600' },
                { label: 'Active Tables', value: Object.values(state.tables).filter(t => t.status !== 'available').length, icon: Users, color: 'from-amber-500 to-orange-600' }
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl p-6 hover:shadow-xl transition-all duration-300 border border-gray-0">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-gray-600 font-medium text-lg">{label}</p>
                      <p className="text-2xl font-extrabold text-gray-900 mt-1">{value}</p>
                    </div>
                    <div className={`p-3 bg-gradient-to-r ${color} rounded-2xl shadow-md`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl p-8 border border-gray-200">
                <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                  Popular Items
                </h3>
                <div className="space-y-4">
                  {Object.entries(state.dailyStats.popularItems || {})
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 5)
                    .map(([itemId, count]) => {
                      const item = menuItems.find(i => i.id === parseInt(itemId));
                      return item ? (
                        <div key={itemId} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all duration-200">
                          <div>
                            <p className="font-semibold text-gray-900">{item.name}</p>
                            <p className="text-sm text-gray-600">₹{getCurrentPrice(item)}</p>
                          </div>
                          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-1 rounded-lg font-semibold">
                            {count} sold
                          </div>
                        </div>
                      ) : null;
                    })}
                  {Object.keys(state.dailyStats.popularItems || {}).length === 0 && (
                    <p className="text-gray-500 text-center py-6 text-lg">No items sold today</p>
                  )}
                </div>
              </div>
              <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl p-8 border border-gray-200">
                <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Users className="w-6 h-6 text-blue-600" />
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
                      <div key={status} className={`p-4 rounded-2xl ${statusConfig.bg} ${statusConfig.border} ${statusConfig.text} transition-all duration-200`}>
                        <div className="flex items-center gap-3">
                          <StatusIcon className="w-6 h-6" />
                          <div>
                            <p className="text-lg font-extrabold">{count}</p>
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
        {state.activeView === 'history' && <HistoryView />}
      </div>
    </div>
  );
};

export default Manager;