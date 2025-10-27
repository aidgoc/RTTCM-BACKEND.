import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useAuth } from '../lib/auth';
import MQTTStatus from './MQTTStatus';
import { useTheme } from '../contexts/ThemeContext';
import { ClockIcon } from '@heroicons/react/24/outline';

function LayoutContent({ children }) {
  const { user, loading } = useAuth();
  const { theme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentPath, setCurrentPath] = useState('/');

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Get current path client-side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentPath(window.location.pathname);
    }
  }, []);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (typeof window !== 'undefined' && !loading && !user && 
        currentPath !== '/login' && currentPath !== '/signup') {
      window.location.href = '/login';
    }
  }, [user, loading, currentPath]);

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="relative">
          <div className="animate-spin rounded-full h-32 w-32 border-4 border-cyan-500/30 border-t-cyan-400"></div>
          <div className="absolute inset-0 animate-ping rounded-full h-32 w-32 border-2 border-cyan-400/20"></div>
        </div>
      </div>
    );
  }

  // Show login/signup pages without layout
  if (!user || currentPath === '/login' || currentPath === '/signup') {
    return (
      <div className="min-h-screen">
        {children}
      </div>
    );
  }

  // Role-based layout
  const isOperator = user.role === 'operator';
  const isSupervisor = user.role === 'supervisor';
  const isAdmin = user.role === 'admin';
  const isManager = user.role === 'manager';
  const isSuperAdmin = user.role === 'superadmin';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {isSuperAdmin ? (
        // Super Admin layout: No sidebar, just content
        <div className="flex flex-col min-h-screen">
          <main className="flex-1">
            {children}
          </main>
        </div>
      ) : isOperator || isSupervisor ? (
        // Operator and Supervisor layout: Top bar only
        <div className="flex flex-col h-screen">
          <TopBar user={user} />
          <main className="flex-1 overflow-auto">
            <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </div>
      ) : isManager ? (
        // Manager layout: Sidebar + main content
        <div className="flex h-screen">
          <Sidebar 
            user={user} 
            isOpen={sidebarOpen} 
            onToggle={() => setSidebarOpen(!sidebarOpen)}
          />
          <div className="flex-1 flex flex-col overflow-hidden">
            <TopBar user={user} onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
            <main className="flex-1 overflow-auto relative z-10">
              <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                {children}
              </div>
            </main>
          </div>
        </div>
      ) : (
        // Admin layout: Sidebar + main content
        <div className="flex h-screen">
          <Sidebar 
            user={user} 
            isOpen={sidebarOpen} 
            onToggle={() => setSidebarOpen(!sidebarOpen)}
          />
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Top navigation bar */}
            <header className="glass-effect border-b border-cyan-500/20 dark:border-gray-700 shadow-2xl">
              <div className="flex items-center justify-between px-4 py-3">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="lg:hidden p-2 rounded-md text-gray-400 dark:text-gray-300 hover:text-gray-500 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                
                <div className="flex items-center space-x-4">
                  {/* Date and Time Display */}
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                    <ClockIcon className="h-4 w-4" />
                    <div className="text-right">
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
                  
                  <MQTTStatus />
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
                    <button
                      onClick={() => {
                        // Handle logout
                        document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                        window.location.href = '/login';
                      }}
                      className="text-gray-400 dark:text-gray-300 hover:text-gray-500 dark:hover:text-white"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </header>

            {/* Main content */}
            <main className="flex-1 overflow-auto relative z-10">
              <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                {children}
              </div>
            </main>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Layout({ children }) {
  return (
    <>
      <LayoutContent>{children}</LayoutContent>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
    </>
  );
}
