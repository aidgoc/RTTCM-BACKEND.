import Link from 'next/link';
import { useState, useEffect } from 'react';
import { HomeIcon, UserIcon, SunIcon, MoonIcon, ClockIcon } from '@heroicons/react/24/outline';
import MQTTStatus from './MQTTStatus';
import { useTheme } from '../contexts/ThemeContext';

export default function TopBar({ user }) {
  const { theme, toggleTheme } = useTheme();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Date and Time Display - Moved to left as requested */}
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
            <ClockIcon className="h-4 w-4" />
            <div className="text-left">
              <div className="font-medium">
                {currentTime.toLocaleDateString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {currentTime.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: true
                })}
              </div>
            </div>
          </div>

          {/* Navigation - Hidden as per user request */}
          <nav className="flex space-x-8">
            {/* Navigation items hidden as per user request */}
          </nav>

          {/* User info and actions */}
          <div className="flex items-center space-x-4">
            <MQTTStatus />
            
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
            >
              {theme === 'light' ? (
                <MoonIcon className="h-5 w-5" />
              ) : (
                <SunIcon className="h-5 w-5" />
              )}
            </button>
            
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Welcome, {user.name}
            </div>
            
            <div className="flex items-center space-x-2">
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                user.role === 'admin' ? 'bg-red-100 text-red-800' :
                user.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                'bg-green-100 text-green-800'
              }`}>
                {user.role.toUpperCase()}
              </div>
              
              <div className="flex items-center space-x-1">
                <UserIcon className="h-5 w-5 text-gray-400 dark:text-gray-300" />
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {user.assignedCranes?.length || 0} crane{user.assignedCranes?.length !== 1 ? 's' : ''}
                </span>
              </div>
              
              <button
                onClick={() => {
                  // Handle logout
                  document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                  window.location.href = '/login';
                }}
                className="text-gray-400 dark:text-gray-300 hover:text-gray-500 dark:hover:text-white p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Logout"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
