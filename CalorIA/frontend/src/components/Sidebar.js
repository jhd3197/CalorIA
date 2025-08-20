import React from 'react';
import { 
  Home, 
  PlusCircle, 
  Calendar, 
  Activity, 
  Scale, 
  Flag, 
  BarChart2, 
  BookOpen, 
  ShoppingCart, 
  Link2, 
  Settings, 
  HelpCircle, 
  ChevronLeft, 
  ChevronRight
} from 'lucide-react';

const Sidebar = ({ collapsed, onToggle }) => {
  const menuItems = [
    { icon: Home, label: 'Dashboard', active: true },
    { icon: PlusCircle, label: 'Log Food / Quick Add' },
    { icon: Calendar, label: 'Meal Planner' },
    { icon: Activity, label: 'Activity' },
    { icon: Scale, label: 'Weight & Body' },
    { icon: Flag, label: 'Goals' },
    { icon: BarChart2, label: 'Progress & Reports' },
    { icon: BookOpen, label: 'Recipes' },
    { icon: ShoppingCart, label: 'Grocery List' },
    { icon: Link2, label: 'Integrations' },
    { icon: Settings, label: 'Settings' },
    { icon: HelpCircle, label: 'Help' }
  ];

  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="logo-icon">C</div>
          <span className="logo-text">CalorieTracker</span>
        </div>
      </div>
      
      <nav>
        <ul className="nav-menu">
          {menuItems.map((item, index) => {
            const IconComponent = item.icon;
            return (
              <li 
                key={index} 
                className={`nav-item ${item.active ? 'active' : ''}`}
              >
                <IconComponent className="nav-icon" />
                <span className="nav-text">{item.label}</span>
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