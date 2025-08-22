import React, { useState } from 'react';
import { Bell, MessageSquare, Menu, LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { logout } from '../utils/api';

const Header = ({ onMobileMenuToggle, userData }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const navigate = useNavigate();
  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  // Get user's initials for avatar
  const getUserInitials = () => {
    if (!userData || !userData.name) return 'U';
    const names = userData.name.split(' ');
    if (names.length >= 2) {
      return names[0][0] + names[1][0];
    }
    return names[0][0];
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      // Even if logout API fails, redirect to login
      navigate('/login');
    } finally {
      setShowUserMenu(false);
    }
  };

  // Toggle user menu
  const toggleUserMenu = () => {
    setShowUserMenu(!showUserMenu);
  };

  // Close user menu when clicking outside
  const handleClickOutside = (e) => {
    if (!e.target.closest('.user-profile')) {
      setShowUserMenu(false);
    }
  };

  React.useEffect(() => {
    if (showUserMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showUserMenu]);

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
          <div className="user-profile relative">
            <div
              className="user-profile-trigger cursor-pointer flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100"
              onClick={toggleUserMenu}
            >
              <div className="user-avatar bg-emerald-600 text-white flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium">
                {getUserInitials()}
              </div>
              <div className="user-info hidden sm:block">
                <span className="user-name block text-sm font-medium text-gray-900">
                  {userData?.name || 'User'}
                </span>
                <span className="user-email block text-xs text-gray-500">
                  {userData?.email || 'user@example.com'}
                </span>
              </div>
            </div>
            
            {/* User dropdown menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border">
                <div className="px-4 py-2 border-b">
                  <p className="text-sm font-medium text-gray-900">{userData?.name || 'User'}</p>
                  <p className="text-sm text-gray-500">{userData?.email || 'user@example.com'}</p>
                </div>
                <button
                  onClick={() => {/* Profile settings could go here */}}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <User className="mr-2 h-4 w-4" />
                  Profile Settings
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;