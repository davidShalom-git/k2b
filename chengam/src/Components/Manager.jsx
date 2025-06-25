import React, { useCallback } from 'react';
import {
  BarChart3, Package, Calendar, Clock, DollarSign, Utensils, TrendingUp, Users,
  Edit3, Save, Trash2, LogOut, Plus, Sparkles
} from 'lucide-react';

const Manager = ({
  state, updateState, getCurrentPrice, getTableStatus, Button,
  addMenuItem, updateMenuItem, deleteMenuItem, setDailyPrice, menuItems, fetchAllData
}) => {
  // Consolidated validation and handlers
  const validateMenuItem = (item) => {
    if (!item.name.trim()) return 'Item name is required';
    if (!item.basePrice || item.basePrice <= 0) return 'Valid base price is required';
    if (!item.preparationTime || item.preparationTime <= 0) return 'Valid preparation time is required';
    return '';
  };

  const handleMenuAction = async (action, id = null) => {
    const error = validateMenuItem(state.newItem);
    if (error) {
      updateState({ menuError: error });
      return;
    }
    
    updateState({ loading: true, menuError: '' });
    try {
      await (action === 'add' ? addMenuItem() : updateMenuItem(id, state.newItem));
      updateState({
        [action === 'add' ? 'showAddItem' : 'editingItem']: action === 'add' ? false : null,
        newItem: { name: '', basePrice: '', category: 'main', description: '', preparationTime: 15 },
        loading: false
      });
    } catch (err) {
      updateState({ 
        menuError: `Failed to ${action} item: ${err.message || 'API Error'}`, 
        loading: false 
      });
    }
  };

  const resetForm = () => updateState({
    showAddItem: false,
    editingItem: null,
    editingDailyPrice: null,
    newItem: { name: '', basePrice: '', category: 'main', description: '', preparationTime: 15 },
    menuError: ''
  });

  // Reusable components
  const Card = ({ children, className = '', gradient = false }) => (
    <div className={`bg-white/95 backdrop-blur-lg rounded-3xl shadow-xl border border-white/20 ${gradient ? 'bg-gradient-to-br from-white/95 to-blue-50/95' : ''} ${className}`}>
      {children}
    </div>
  );

  const StatCard = ({ label, value, icon: Icon, gradient }) => (
    <Card className="p-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-gray-600 font-medium">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
        </div>
        <div className={`p-4 bg-gradient-to-br ${gradient} rounded-2xl shadow-lg`}>
          <Icon className="w-7 h-7 text-white" />
        </div>
      </div>
    </Card>
  );

  const FormInput = ({ type = 'text', placeholder, value, onChange, className = '', ...props }) => (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={`p-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 bg-white/80 backdrop-blur-sm transition-all duration-200 hover:border-gray-300 ${className}`}
      {...props}
    />
  );

  const MenuItemCard = ({ item, isEditing, isDaily = false }) => (
    <Card className="p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300" gradient>
      {isEditing ? (
        <div className="space-y-4">
          <FormInput
            placeholder="Item Name"
            value={state.newItem.name}
            onChange={(e) => updateState({ newItem: { ...state.newItem, name: e.target.value } })}
          />
          <FormInput
            type="number"
            placeholder="Price"
            value={state.newItem.basePrice}
            onChange={(e) => updateState({ newItem: { ...state.newItem, basePrice: e.target.value } })}
            min="0"
            step="0.01"
            autoFocus
          />
          {!isDaily && (
            <>
              <select
                value={state.newItem.category}
                onChange={(e) => updateState({ newItem: { ...state.newItem, category: e.target.value } })}
                className="p-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 bg-white/80 backdrop-blur-sm transition-all duration-200 w-full"
              >
                <option value="main">Main Course</option>
                <option value="starter">Starter</option>
                <option value="dessert">Dessert</option>
                <option value="beverage">Beverage</option>
              </select>
              <FormInput
                placeholder="Description"
                value={state.newItem.description}
                onChange={(e) => updateState({ newItem: { ...state.newItem, description: e.target.value } })}
                autoFocus
              />
              <FormInput
                type="number"
                placeholder="Prep Time (min)"
                value={state.newItem.preparationTime}
                onChange={(e) => updateState({ newItem: { ...state.newItem, preparationTime: e.target.value } })}
                min="1"
                autoFocus
              />
            </>
          )}
          {isDaily && (
            <label className="flex items-center gap-3 p-2">
              <input
                type="checkbox"
                checked={state.newItem.isAvailable !== false}
                onChange={(e) => updateState({ newItem: { ...state.newItem, isAvailable: e.target.checked } })}
                className="w-5 h-5 accent-blue-600 rounded"
                autoFocus
              />
              <span className="font-medium text-gray-700">Available</span>
            </label>
          )}
          <div className="flex gap-3">
            <Button
              onClick={() => isDaily ? 
                setDailyPrice(item.id, state.newItem.basePrice, state.newItem.isAvailable !== false) :
                handleMenuAction(item ? 'update' : 'add', item?.id)
              }
              disabled={state.loading}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg transition-all duration-200"
            >
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
            <Button
              onClick={resetForm}
              className="flex-1 bg-gray-200 text-gray-800 rounded-2xl hover:bg-gray-300 transition-all duration-200"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h4 className="font-bold text-xl text-gray-900 mb-2">{item.name}</h4>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                ₹{getCurrentPrice(item)}
              </span>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium capitalize">
                {item.category}
              </span>
            </div>
            {item.description && <p className="text-gray-600 text-sm mb-2">{item.description}</p>}
            <p className="text-gray-500 text-sm flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {item.preparationTime} min
            </p>
            {isDaily && state.dailyPricing[item.id] && (
              <p className="text-sm text-blue-600 mt-2 font-medium">
                {state.dailyPricing[item.id].isAvailable ? '✅ Available today' : '❌ Not available'}
              </p>
            )}
          </div>
          <div className="flex gap-2 ml-4">
            <Button
              onClick={() => updateState({
                [isDaily ? 'editingDailyPrice' : 'editingItem']: item.id,
                newItem: {
                  name: item.name,
                  basePrice: isDaily ? (state.dailyPricing[item.id]?.price || item.basePrice) : item.basePrice,
                  category: item.category,
                  description: item.description || '',
                  preparationTime: item.preparationTime,
                  isAvailable: isDaily ? (state.dailyPricing[item.id]?.isAvailable !== false) : true
                }
              })}
              className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-2xl hover:from-gray-200 hover:to-gray-300 transition-all duration-200 p-3"
              size="sm"
            >
              <Edit3 className="w-4 h-4" />
            </Button>
            {!isDaily && (
              <Button
                onClick={() => deleteMenuItem(item.id)}
                className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-2xl hover:from-red-600 hover:to-red-700 transition-all duration-200 p-3"
                size="sm"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );

  const PageHeader = ({ title, icon: Icon, subtitle, action }) => (
    <Card className="p-8 mb-8" gradient>
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-4xl font-bold text-gray-900 flex items-center gap-4 mb-2">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg">
              <Icon className="w-8 h-8 text-white" />
            </div>
            {title}
          </h2>
          <p className="text-gray-600 text-lg">{subtitle}</p>
        </div>
        {action}
      </div>
    </Card>
  );

  // Tab configuration
  const tabs = [
    { key: 'overview', label: 'Overview', icon: BarChart3 },
    { key: 'menu-management', label: 'Menu', icon: Package },
    { key: 'daily-pricing', label: 'Pricing', icon: Calendar },
    { key: 'history', label: 'History', icon: Clock }
  ];

  const stats = [
    { label: 'Total Revenue', value: `₹${state.dailyStats.totalRevenue?.toLocaleString?.() ?? 0}`, icon: DollarSign, gradient: 'from-emerald-500 to-green-600' },
    { label: 'Total Orders', value: state.dailyStats.totalOrders?.toLocaleString?.() ?? 0, icon: Utensils, gradient: 'from-blue-500 to-indigo-600' },
    { label: 'Avg Order Value', value: `₹${state.dailyStats.avgOrderValue?.toLocaleString?.() ?? 0}`, icon: TrendingUp, gradient: 'from-purple-500 to-pink-600' },
    { label: 'Active Tables', value: Object.values(state.tables).filter(t => t.status !== 'available').length, icon: Users, gradient: 'from-amber-500 to-orange-600' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col justify-between items-center mb-8">
          <PageHeader
            title="Manager Dashboard"
            icon={BarChart3}
            subtitle="Business analytics and insights"
          />
          <Button
            onClick={() => updateState({ isManager: false, activeView: 'tables', managerToken: '' })}
            className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-2xl hover:from-red-600 hover:to-red-700 hover:shadow-lg transition-all duration-200 px-6 py-3"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </Button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => updateState({ managerTab: tab.key })}
              className={`px-6 py-4 rounded-2xl font-semibold transition-all duration-300 flex items-center gap-3 whitespace-nowrap ${
                state.managerTab === tab.key
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl scale-105'
                  : 'bg-white/80 backdrop-blur-sm hover:bg-white text-gray-700 hover:shadow-md'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {state.managerTab === 'overview' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {stats.map((stat) => (
                <StatCard key={stat.label} {...stat} />
              ))}
            </div>
            <Card className="p-8" gradient>
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <Users className="w-6 h-6 text-blue-600" />
                Table Status Overview
              </h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries({ available: 'Available', occupied: 'Occupied', billed: 'Billed', paid: 'Paid' }).map(([status, label]) => {
                  const count = Object.values(state.tables).filter(t => t.status === status).length;
                  const statusConfig = getTableStatus(status);
                  const StatusIcon = statusConfig.icon;
                  return (
                    <div key={status} className={`p-4 rounded-2xl ${statusConfig.bg} ${statusConfig.border} transition-all duration-200 hover:scale-105`}>
                      <div className="flex items-center gap-3">
                        <StatusIcon className="w-6 h-6" />
                        <div>
                          <p className="text-2xl font-bold">{count}</p>
                          <p className="text-sm opacity-80">{label}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </>
        )}

        {state.managerTab === 'menu-management' && (
          <>
            <PageHeader
              title="Menu Management"
              icon={Package}
              subtitle="Manage your restaurant's menu items and pricing"
              action={
                <Button
                  onClick={() => updateState({ showAddItem: true, menuError: '' })}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg transition-all duration-200 px-6 py-3"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add Item
                </Button>
              }
            />

            {state.showAddItem && (
              <Card className="p-8 mb-8" gradient>
                <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-blue-600" />
                  Add New Menu Item
                </h3>
                {state.menuError && (
                  <div className="bg-red-50 border-2 border-red-200 text-red-800 p-4 rounded-2xl mb-6 flex items-center justify-between">
                    <span>{state.menuError}</span>
                    {state.menuError.includes('Failed') && (
                      <Button
                        onClick={() => handleMenuAction('add')}
                        className="ml-4 bg-blue-600 text-white rounded-xl px-4 py-2 hover:bg-blue-700"
                        size="sm"
                      >
                        Try Again
                      </Button>
                    )}
                  </div>
                )}
                <MenuItemCard item={null} isEditing={true} />
              </Card>
            )}

            <Card className="p-8" gradient>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Menu Items</h3>
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {menuItems.map(item => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    isEditing={state.editingItem === item.id}
                  />
                ))}
              </div>
            </Card>
          </>
        )}

        {state.managerTab === 'daily-pricing' && (
          <>
            <PageHeader
              title="Daily Pricing"
              icon={Calendar}
              subtitle="Adjust daily pricing for menu items"
            />
            <div className="mb-8">
              <FormInput
                type="date"
                value={state.selectedDate}
                onChange={(e) => updateState({ selectedDate: e.target.value })}
                className="max-w-xs"
              />
            </div>
            {state.menuError && (
              <div className="bg-red-50 border-2 border-red-200 text-red-800 p-4 rounded-2xl mb-8">
                {state.menuError}
              </div>
            )}
            <Card className="p-8" gradient>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Menu Items Pricing</h3>
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {menuItems.map(item => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    isEditing={state.editingDailyPrice === item.id}
                    isDaily={true}
                  />
                ))}
              </div>
            </Card>
          </>
        )}

        {state.managerTab === 'history' && (
          <>
            <PageHeader
              title="Order History"
              icon={Clock}
              subtitle="View recent completed orders"
            />
            {state.dailyStats.completedOrders?.length > 0 ? (
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-gray-50 to-blue-50">
                      <tr>
                        {['Table', 'Items', 'Total', 'Order Time', 'Completed'].map(header => (
                          <th key={header} className="px-6 py-4 text-left font-bold text-gray-900">{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
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
              </Card>
            ) : (
              <Card className="p-12 text-center" gradient>
                <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 font-medium text-lg">No completed orders today</p>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Manager;