import React, { useState } from 'react';
import { ShoppingCart, Plus, Check, X, DollarSign, Clock, Package, Trash2 } from 'lucide-react';

const GroceryList = () => {
  const [newItem, setNewItem] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Produce');

  // Sample grocery data
  const [groceryItems, setGroceryItems] = useState([
    { id: 1, name: 'Bananas', category: 'Produce', quantity: '6 pieces', price: 2.50, completed: false, priority: 'medium' },
    { id: 2, name: 'Chicken Breast', category: 'Meat', quantity: '2 lbs', price: 12.99, completed: true, priority: 'high' },
    { id: 3, name: 'Greek Yogurt', category: 'Dairy', quantity: '2 containers', price: 6.98, completed: false, priority: 'medium' },
    { id: 4, name: 'Whole Wheat Bread', category: 'Bakery', quantity: '1 loaf', price: 3.49, completed: false, priority: 'low' },
    { id: 5, name: 'Spinach', category: 'Produce', quantity: '1 bag', price: 2.99, completed: true, priority: 'high' },
    { id: 6, name: 'Salmon Fillets', category: 'Meat', quantity: '1.5 lbs', price: 18.99, completed: false, priority: 'high' },
    { id: 7, name: 'Milk', category: 'Dairy', quantity: '1 gallon', price: 4.29, completed: false, priority: 'medium' },
    { id: 8, name: 'Olive Oil', category: 'Pantry', quantity: '1 bottle', price: 7.99, completed: false, priority: 'low' },
    { id: 9, name: 'Bell Peppers', category: 'Produce', quantity: '3 pieces', price: 4.47, completed: false, priority: 'medium' },
    { id: 10, name: 'Rice', category: 'Pantry', quantity: '5 lb bag', price: 8.99, completed: true, priority: 'medium' }
  ]);

  const categories = ['Produce', 'Meat', 'Dairy', 'Bakery', 'Pantry', 'Frozen', 'Other'];
  
  const totalItems = groceryItems.length;
  const completedItems = groceryItems.filter(item => item.completed).length;
  const totalCost = groceryItems.reduce((sum, item) => sum + item.price, 0);
  const remainingCost = groceryItems.filter(item => !item.completed).reduce((sum, item) => sum + item.price, 0);

  const recentlyPurchased = [
    { name: 'Avocados', date: '2 days ago', price: 3.99 },
    { name: 'Ground Turkey', date: '3 days ago', price: 8.99 },
    { name: 'Blueberries', date: '1 week ago', price: 4.49 },
    { name: 'Quinoa', date: '1 week ago', price: 9.99 }
  ];

  const toggleItem = (itemId) => {
    setGroceryItems(items =>
      items.map(item =>
        item.id === itemId ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const deleteItem = (itemId) => {
    setGroceryItems(items => items.filter(item => item.id !== itemId));
  };

  const addItem = () => {
    if (newItem.trim()) {
      const newId = Math.max(...groceryItems.map(item => item.id)) + 1;
      setGroceryItems([...groceryItems, {
        id: newId,
        name: newItem.trim(),
        category: selectedCategory,
        quantity: '1 unit',
        price: 0,
        completed: false,
        priority: 'medium'
      }]);
      setNewItem('');
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high': return 'border-l-red-500';
      case 'medium': return 'border-l-yellow-500';
      case 'low': return 'border-l-green-500';
      default: return 'border-l-gray-500';
    }
  };

  const groupedItems = categories.reduce((acc, category) => {
    acc[category] = groceryItems.filter(item => item.category === category);
    return acc;
  }, {});

  return (
    <>
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Items</p>
              <p className="font-semibold">{totalItems} items</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mr-3">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Completed</p>
              <p className="font-semibold">{completedItems}/{totalItems}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mr-3">
              <DollarSign className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Cost</p>
              <p className="font-semibold">${totalCost.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mr-3">
              <Package className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Remaining</p>
              <p className="font-semibold">${remainingCost.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Shopping List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="heading text-lg font-semibold">Shopping List</h2>
              <div className="text-sm text-gray-500">
                {completedItems} of {totalItems} items completed
              </div>
            </div>

            {/* Add New Item */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Add new item..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addItem()}
                  />
                </div>
                <select
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                <button
                  onClick={addItem}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </button>
              </div>
            </div>

            {/* Shopping List by Category */}
            <div className="space-y-6">
              {categories.map(category => {
                const categoryItems = groupedItems[category];
                if (categoryItems.length === 0) return null;
                
                return (
                  <div key={category} className="space-y-2">
                    <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide border-b border-gray-200 pb-2">
                      {category} ({categoryItems.length})
                    </h3>
                    <div className="space-y-2">
                      {categoryItems.map((item) => (
                        <div
                          key={item.id}
                          className={`flex items-center p-3 rounded-lg border-l-4 ${getPriorityColor(item.priority)} ${
                            item.completed ? 'bg-green-50 opacity-60' : 'bg-gray-50'
                          }`}
                        >
                          <button
                            onClick={() => toggleItem(item.id)}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center mr-3 transition-colors ${
                              item.completed
                                ? 'bg-green-500 border-green-500 text-white'
                                : 'border-gray-300 hover:border-green-500'
                            }`}
                          >
                            {item.completed && <Check className="w-3 h-3" />}
                          </button>
                          <div className="flex-1">
                            <p className={`font-medium ${item.completed ? 'line-through text-gray-500' : ''}`}>
                              {item.name}
                            </p>
                            <p className="text-sm text-gray-500">{item.quantity}</p>
                          </div>
                          <div className="text-right mr-3">
                            <p className={`font-semibold ${item.completed ? 'text-gray-500' : ''}`}>
                              ${item.price.toFixed(2)}
                            </p>
                          </div>
                          <button
                            onClick={() => deleteItem(item.id)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Progress Bar */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-800">Shopping Progress</span>
                <span className="text-sm text-blue-600">{Math.round((completedItems / totalItems) * 100)}%</span>
              </div>
              <div className="w-full bg-blue-100 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{width: `${(completedItems / totalItems) * 100}%`}}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Shopping Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="heading text-lg font-semibold mb-4">Shopping Summary</h2>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Items:</span>
                <span className="font-semibold">{totalItems}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Completed:</span>
                <span className="font-semibold text-green-600">{completedItems}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Remaining:</span>
                <span className="font-semibold text-orange-600">{totalItems - completedItems}</span>
              </div>
              <hr className="my-3" />
              <div className="flex justify-between">
                <span className="text-gray-600">Total Cost:</span>
                <span className="font-semibold">${totalCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Completed Cost:</span>
                <span className="font-semibold text-green-600">${(totalCost - remainingCost).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Remaining Cost:</span>
                <span className="font-semibold text-orange-600">${remainingCost.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Recently Purchased */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="heading text-lg font-semibold">Recently Purchased</h2>
              <Clock className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-3">
              {recentlyPurchased.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.date}</p>
                  </div>
                  <span className="text-sm font-semibold text-green-600">${item.price}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="heading text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <button className="w-full p-3 text-left bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                <div className="flex items-center">
                  <Plus className="w-5 h-5 text-blue-600 mr-3" />
                  <span className="text-blue-600 font-medium">Add from meal plan</span>
                </div>
              </button>
              <button className="w-full p-3 text-left bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
                <div className="flex items-center">
                  <Package className="w-5 h-5 text-purple-600 mr-3" />
                  <span className="text-purple-600 font-medium">Add from recipes</span>
                </div>
              </button>
              <button className="w-full p-3 text-left bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
                <div className="flex items-center">
                  <Check className="w-5 h-5 text-green-600 mr-3" />
                  <span className="text-green-600 font-medium">Mark all completed</span>
                </div>
              </button>
              <button className="w-full p-3 text-left bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                <div className="flex items-center">
                  <X className="w-5 h-5 text-red-600 mr-3" />
                  <span className="text-red-600 font-medium">Clear completed</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default GroceryList;