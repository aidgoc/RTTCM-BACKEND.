import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../lib/auth';
import { 
  HomeIcon, 
  CogIcon, 
  UsersIcon, 
  TicketIcon, 
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Assets', href: '/assets', icon: CogIcon, requiresAssetAccess: true },
  { name: 'Users', href: '/users', icon: UsersIcon, requiresUserManagement: true },
  { name: 'Tickets', href: '/tickets', icon: TicketIcon },
  { name: 'Settings', href: '/settings', icon: AdjustmentsHorizontalIcon, requiresManagerAccess: true },
];

export default function Sidebar({ user, isOpen, onToggle }) {
  const [collapsed, setCollapsed] = useState(false);
  const [currentPath, setCurrentPath] = useState('/');
  const { 
    canViewAssets, 
    canCreateUser, 
    canManageCranes, 
    canManageUsers,
    hasRole 
  } = useAuth();

  // Get current path client-side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentPath(window.location.pathname);
    }
  }, []);

  const filteredNavigation = navigation.filter(item => {
    // Dashboard is always accessible
    if (item.name === 'Dashboard') return true;
    
    // Role-based filtering
    if (item.requiresAdminAccess && !hasRole('admin')) return false;
    if (item.requiresManagerAccess && !hasRole('manager') && !hasRole('admin')) return false;
    if (item.requiresAssetAccess && !canViewAssets()) return false;
    if (item.requiresUserManagement && !canManageUsers()) return false;
    
    return true;
  });

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 lg:hidden"
          onClick={onToggle}
        >
          <div className="absolute inset-0 bg-gray-600 dark:bg-gray-900 opacity-75"></div>
        </div>
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-54 bg-gradient-to-b from-sky-100 to-sky-200 dark:from-gray-700 dark:to-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        ${collapsed ? 'lg:w-14' : 'lg:w-52'}
      `}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-sky-300 dark:border-gray-600">
          {!collapsed && (
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gradient-to-r from-sky-500 to-sky-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">TD</span>
                </div>
              </div>
              <div className="ml-3">
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Tower Dynamics</h1>
              </div>
            </div>
          )}
          
          {collapsed && (
            <div className="flex-shrink-0 mx-auto">
              <div className="w-8 h-8 bg-gradient-to-r from-sky-500 to-sky-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">TD</span>
              </div>
            </div>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:block p-1 rounded-md text-sky-400 dark:text-sky-300 hover:text-sky-500 dark:hover:text-sky-200 hover:bg-sky-100 dark:hover:bg-gray-700"
          >
            {collapsed ? (
              <ChevronRightIcon className="h-5 w-5" />
            ) : (
              <ChevronLeftIcon className="h-5 w-5" />
            )}
          </button>

          <button
            onClick={onToggle}
            className="lg:hidden p-1 rounded-md text-sky-400 dark:text-sky-300 hover:text-sky-500 dark:hover:text-sky-200 hover:bg-sky-100 dark:hover:bg-gray-700"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-5 px-2 space-y-1">
          {filteredNavigation.map((item) => {
            const isActive = currentPath === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-200
                  ${isActive
                    ? 'bg-sky-200 dark:bg-sky-800 text-sky-900 dark:text-sky-100 border-r-2 border-sky-600 dark:border-sky-400'
                    : 'text-sky-800 dark:text-sky-200 hover:bg-sky-100 dark:hover:bg-gray-600 hover:text-sky-900 dark:hover:text-white'
                  }
                `}
                onClick={() => {
                  // Close mobile sidebar when navigating
                  if (window.innerWidth < 1024) {
                    onToggle();
                  }
                }}
              >
                <item.icon
                  className={`
                    flex-shrink-0 h-5 w-5 mr-3
                    ${isActive ? 'text-sky-600 dark:text-sky-300' : 'text-sky-500 dark:text-sky-400 group-hover:text-sky-600 dark:group-hover:text-sky-300'}
                  `}
                />
                {!collapsed && (
                  <span className="truncate">{item.name}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User info at bottom */}
        {!collapsed && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-sky-300 dark:border-gray-600">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gradient-to-r from-sky-400 to-sky-500 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-sky-900 dark:text-white">{user.name}</p>
                <p className="text-xs text-sky-600 dark:text-sky-300">{user.email}</p>
                <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                  user.role === 'admin' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' :
                  user.role === 'manager' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' :
                  user.role === 'supervisor' ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200' :
                  'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                }`}>
                  {user.role.toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
