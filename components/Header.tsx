import React, { useState } from 'react';

interface HeaderProps {
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

const Header: React.FC<HeaderProps> = ({ onToggleSidebar, isSidebarOpen }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="mobile-header">
      <div className="max-w-7xl mx-auto px-mobile">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Logo and mobile menu button */}
          <div className="flex items-center">
            <button
              onClick={onToggleSidebar}
              className="md:hidden touch-target p-3 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 touch-feedback"
              aria-label="Toggle sidebar"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isSidebarOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>

            <div className="flex items-center ml-4 md:ml-0">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-gradient-primary">LinguaFlip</h1>
              </div>
            </div>
          </div>

          {/* Center - Navigation menu (hidden on mobile) */}
          <nav className="hidden md:flex space-x-8">
            <a href="#" className="text-neutral-700 hover:text-primary-600 px-3 py-2 text-sm font-medium transition-colors duration-200">
              Dashboard
            </a>
            <a href="#" className="text-primary-600 border-b-2 border-primary-600 px-3 py-2 text-sm font-medium">
              Study
            </a>
            <a href="#" className="text-neutral-700 hover:text-primary-600 px-3 py-2 text-sm font-medium transition-colors duration-200">
              Progress
            </a>
            <a href="#" className="text-neutral-700 hover:text-primary-600 px-3 py-2 text-sm font-medium transition-colors duration-200">
              Settings
            </a>
          </nav>

          {/* Right side - Quick actions and user menu */}
          <div className="flex items-center space-x-4">
            {/* Quick action buttons */}
            <div className="hidden sm:flex items-center space-x-2">
              <button className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors duration-200" title="Help">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              <button className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors duration-200" title="Notifications">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM15 17H9a2 2 0 01-2-2V5a2 2 0 012-2h6a2 2 0 012 2v10a2 2 0 01-2 2z" />
                </svg>
              </button>
            </div>

            {/* User avatar and menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 p-2 rounded-md hover:bg-neutral-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
                  U
                </div>
                <svg className="h-4 w-4 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* User dropdown menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-neutral-200">
                  <div className="px-4 py-2 border-b border-neutral-200">
                    <p className="text-sm font-medium text-neutral-900">User</p>
                    <p className="text-xs text-neutral-500">user@example.com</p>
                  </div>
                  <a href="#" className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100">
                    Profile Settings
                  </a>
                  <a href="#" className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100">
                    Study Statistics
                  </a>
                  <a href="#" className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100">
                    Help & Support
                  </a>
                  <div className="border-t border-neutral-200"></div>
                  <a href="#" className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100">
                    Sign Out
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;