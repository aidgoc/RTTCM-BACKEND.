import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAuth } from '../src/lib/auth';
import { settingsAPI } from '../src/lib/api';
import { useTheme } from '../src/contexts/ThemeContext';
import toast from 'react-hot-toast';
import { 
  CogIcon, 
  ServerIcon, 
  BellIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

export default function Settings() {
  const { user } = useAuth();
  const { theme, changeTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('general');
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({});

  // Fetch settings data
  const { data: settingsData, isLoading: settingsLoading } = useQuery(
    'settings',
    settingsAPI.getSettings,
    {
      onSuccess: (data) => {
        setFormData(data.settings || {});
      }
    }
  );

  // Fetch system status
  const { data: systemStatus, isLoading: statusLoading } = useQuery(
    'system-status',
    settingsAPI.getSystemStatus,
    {
      refetchInterval: 30000, // Refresh every 30 seconds
    }
  );

  // Update settings mutation
  const updateSettingsMutation = useMutation(settingsAPI.updateSettings, {
    onSuccess: () => {
      toast.success('Settings saved successfully!');
      queryClient.invalidateQueries('settings');
    },
    onError: (error) => {
      toast.error('Failed to save settings');
      console.error('Update settings error:', error);
    }
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Handle theme change immediately
    if (field === 'theme') {
      const themeValue = value.toLowerCase();
      changeTheme(themeValue);
    }
  };

  const handleSave = () => {
    updateSettingsMutation.mutate(formData);
  };

  const tabs = [
    { id: 'general', name: 'General', icon: CogIcon },
    { id: 'system', name: 'System', icon: ServerIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'security', name: 'Security', icon: ShieldCheckIcon },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">General Settings</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Manage your application preferences</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Application Name</label>
                <input
                  type="text"
                  value={formData.applicationName || ''}
                  onChange={(e) => handleInputChange('applicationName', e.target.value)}
                  className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 sm:text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Default Language</label>
                <select 
                  value={formData.defaultLanguage || 'English'}
                  onChange={(e) => handleInputChange('defaultLanguage', e.target.value)}
                  className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 sm:text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 px-3 py-2"
                >
                  <option value="English">English</option>
                  <option value="Spanish">Spanish</option>
                  <option value="French">French</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Theme</label>
                <select 
                  value={formData.theme || theme.charAt(0).toUpperCase() + theme.slice(1)}
                  onChange={(e) => handleInputChange('theme', e.target.value)}
                  className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 sm:text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 px-3 py-2"
                >
                  <option value="Light">Light</option>
                  <option value="Dark">Dark</option>
                  <option value="Auto">Auto</option>
                </select>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    theme === 'dark' ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'
                  }`}></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Current theme: {theme.charAt(0).toUpperCase() + theme.slice(1)}
                  </span>
                </div>
                <button
                  onClick={handleSave}
                  disabled={updateSettingsMutation.isLoading}
                  className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                >
                  {updateSettingsMutation.isLoading ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </div>
        );

      case 'system':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">System Configuration</h3>
              <p className="text-sm text-gray-500">Real-time system status and configuration</p>
            </div>
            
            {statusLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className={`border rounded-lg p-4 ${
                  systemStatus?.mqtt?.connected ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}>
                  <h4 className={`text-sm font-medium ${
                    systemStatus?.mqtt?.connected ? 'text-green-900' : 'text-red-900'
                  }`}>MQTT Configuration</h4>
                  <p className={`text-sm mt-1 ${
                    systemStatus?.mqtt?.connected ? 'text-green-700' : 'text-red-700'
                  }`}>
                    Broker: {systemStatus?.mqtt?.broker || 'Not configured'}
                  </p>
                  <p className={`text-sm ${
                    systemStatus?.mqtt?.connected ? 'text-green-700' : 'text-red-700'
                  }`}>
                    Status: {systemStatus?.mqtt?.connected ? 'Connected' : 'Disconnected'}
                  </p>
                  {systemStatus?.mqtt?.lastMessage && (
                    <p className={`text-xs mt-1 ${
                      systemStatus?.mqtt?.connected ? 'text-green-600' : 'text-red-600'
                    }`}>
                      Last message: {new Date(systemStatus.mqtt.lastMessage).toLocaleString()}
                    </p>
                  )}
                </div>
                
                <div className={`border rounded-lg p-4 ${
                  systemStatus?.database?.connected ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}>
                  <h4 className={`text-sm font-medium ${
                    systemStatus?.database?.connected ? 'text-green-900' : 'text-red-900'
                  }`}>Database Status</h4>
                  <p className={`text-sm mt-1 ${
                    systemStatus?.database?.connected ? 'text-green-700' : 'text-red-700'
                  }`}>
                    MongoDB: {systemStatus?.database?.connected ? 'Connected' : 'Disconnected'}
                  </p>
                  <p className={`text-sm ${
                    systemStatus?.database?.connected ? 'text-green-700' : 'text-red-700'
                  }`}>
                    Collections: {systemStatus?.database?.collections || 0} active
                  </p>
                  {systemStatus?.database?.lastCheck && (
                    <p className={`text-xs mt-1 ${
                      systemStatus?.database?.connected ? 'text-green-600' : 'text-red-600'
                    }`}>
                      Last check: {new Date(systemStatus.database.lastCheck).toLocaleString()}
                    </p>
                  )}
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-900">Server Status</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Backend: {systemStatus?.server?.backend?.status || 'Unknown'} on port {systemStatus?.server?.backend?.port || 'N/A'}
                  </p>
                  <p className="text-sm text-blue-700">
                    Frontend: {systemStatus?.server?.frontend?.status || 'Unknown'} on port {systemStatus?.server?.frontend?.port || 'N/A'}
                  </p>
                  {systemStatus?.server?.backend?.uptime && (
                    <p className="text-xs text-blue-600 mt-1">
                      Uptime: {Math.floor(systemStatus.server.backend.uptime / 3600)}h {Math.floor((systemStatus.server.backend.uptime % 3600) / 60)}m
                    </p>
                  )}
                </div>

                <div className="text-xs text-gray-500 mt-4">
                  Last updated: {systemStatus?.timestamp ? new Date(systemStatus.timestamp).toLocaleString() : 'Never'}
                </div>
              </div>
            )}
          </div>
        );


      case 'notifications':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Notification Settings</h3>
              <p className="text-sm text-gray-500">Configure how you receive alerts and updates</p>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Email Notifications</h4>
                  <p className="text-sm text-gray-500">Receive alerts via email</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={formData.emailNotifications || false}
                  onChange={(e) => handleInputChange('emailNotifications', e.target.checked)}
                  className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-gray-300 rounded" 
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Browser Notifications</h4>
                  <p className="text-sm text-gray-500">Show browser notifications</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={formData.browserNotifications || false}
                  onChange={(e) => handleInputChange('browserNotifications', e.target.checked)}
                  className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-gray-300 rounded" 
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Critical Alerts</h4>
                  <p className="text-sm text-gray-500">Immediate notifications for critical issues</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={formData.criticalAlerts || false}
                  onChange={(e) => handleInputChange('criticalAlerts', e.target.checked)}
                  className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-gray-300 rounded" 
                />
              </div>

              <div className="pt-4">
                <button
                  onClick={handleSave}
                  disabled={updateSettingsMutation.isLoading}
                  className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                >
                  {updateSettingsMutation.isLoading ? 'Saving...' : 'Save Notification Settings'}
                </button>
              </div>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Security Settings</h3>
              <p className="text-sm text-gray-500">Configure security and access controls</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Session Timeout</h4>
                <select 
                  value={formData.sessionTimeout || '30 minutes'}
                  onChange={(e) => handleInputChange('sessionTimeout', e.target.value)}
                  className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 sm:text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 px-3 py-2"
                >
                  <option value="15 minutes">15 minutes</option>
                  <option value="30 minutes">30 minutes</option>
                  <option value="1 hour">1 hour</option>
                  <option value="2 hours">2 hours</option>
                </select>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-900">Password Policy</h4>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center">
                    <input 
                      type="checkbox" 
                      checked={formData.requireStrongPasswords || false}
                      onChange={(e) => handleInputChange('requireStrongPasswords', e.target.checked)}
                      className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-gray-300 rounded" 
                    />
                    <label className="ml-2 text-sm text-gray-700">Require strong passwords</label>
                  </div>
                  <div className="flex items-center">
                    <input 
                      type="checkbox" 
                      checked={formData.passwordChangeInterval > 0 || false}
                      onChange={(e) => handleInputChange('passwordChangeInterval', e.target.checked ? 90 : 0)}
                      className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-gray-300 rounded" 
                    />
                    <label className="ml-2 text-sm text-gray-700">Require password change every 90 days</label>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={handleSave}
                  disabled={updateSettingsMutation.isLoading}
                  className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                >
                  {updateSettingsMutation.isLoading ? 'Saving...' : 'Save Security Settings'}
                </button>
              </div>
            </div>
          </div>
        );


      default:
        return null;
    }
  };

  if (settingsLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-blue-600 dark:text-blue-400">Settings</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">Manage your application configuration and preferences</p>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                    ${activeTab === tab.id
                      ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                    }
                  `}
                >
                  <Icon className={`
                    -ml-0.5 mr-2 h-5 w-5
                    ${activeTab === tab.id ? 'text-sky-500' : 'text-gray-400 group-hover:text-gray-500'}
                  `} />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}
