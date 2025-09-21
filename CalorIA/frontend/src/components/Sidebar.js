import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  PlusCircle,
  Calendar,
  Activity,
  Scale,
  Flag,
  BarChart2,
  BookOpen,
  Package,
  ShoppingCart,
  Link2,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  ChefHat
} from 'lucide-react';

const Sidebar = ({ collapsed, onToggle, currentPath }) => {
  const menuItems = [
    { id: 'dashboard', icon: Home, label: 'Dashboard', path: '/dashboard' },
    { id: 'meal-planner', icon: Calendar, label: 'Meal Planner', path: '/meal-planner' },
    { id: 'meal-prep', icon: ChefHat, label: 'Meal Prep', path: '/meal-prep' },
    { id: 'recipes', icon: BookOpen, label: 'Recipes', path: '/recipes' },
    { id: 'ingredients', icon: Package, label: 'Ingredients', path: '/ingredients' },
    { id: 'inventory', icon: Package, label: 'Inventory', path: '/inventory' },
    { id: 'grocery-list', icon: ShoppingCart, label: 'Grocery List', path: '/grocery-list' },
    { id: 'settings', icon: Settings, label: 'Settings', path: '/settings' },
  ];

  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="logo-icon">C</div>
          <span className="logo-text">CalorIA</span>
        </div>
      </div>
      
      <nav>
        <ul className="nav-menu">
          {menuItems.map((item, index) => {
            const IconComponent = item.icon;
            const isActive = currentPath === item.path;
            return (
              <li key={index} className={`nav-item ${isActive ? 'active' : ''}`}>
                <Link to={item.path} className="nav-link">
                  <IconComponent className="nav-icon" />
                  <span className="nav-text">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div className="sidebar-toggle">
        <button 
          onClick={onToggle}
          className="toggle-button"
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          <span className="nav-text" style={{ marginLeft: '0.5rem' }}>
            {collapsed ? 'Expand' : 'Collapse'}
          </span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;