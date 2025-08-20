import React from 'react';
import { Bell, MessageSquare, Menu } from 'lucide-react';

const Header = ({ onMobileMenuToggle }) => {
  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          <button 
            onClick={onMobileMenuToggle}
            className="mobile-menu-button"
          >
            <Menu size={20} />
          </button>
          <div>
            <input 
              type="date" 
              className="date-input" 
              defaultValue={today}
            />
          </div>
        </div>
        <div className="header-right">
          <div className="notification-icons">
            <div className="notification-icon">
              <Bell size={16} />
            </div>
            <div className="notification-icon">
              <MessageSquare size={16} />
            </div>
          </div>
          <div className="user-profile">
            <div className="user-avatar">U</div>
            <span className="user-name">User</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;