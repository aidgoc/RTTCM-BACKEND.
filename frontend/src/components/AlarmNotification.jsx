import React, { useState, useEffect } from 'react';
import { 
  ExclamationTriangleIcon, 
  XMarkIcon,
  BellIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

const AlarmNotification = ({ alarm, onDismiss, onAcknowledge }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isAcknowledged, setIsAcknowledged] = useState(false);

  const getAlarmIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return <XCircleIcon className="h-6 w-6 text-red-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500" />;
      case 'info':
        return <InformationCircleIcon className="h-6 w-6 text-blue-500" />;
      default:
        return <BellIcon className="h-6 w-6 text-gray-500" />;
    }
  };

  const getAlarmColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'border-red-500 bg-red-50 dark:bg-red-900/20';
      case 'warning':
        return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
      case 'info':
        return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20';
      default:
        return 'border-gray-500 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const getSeverityText = (severity) => {
    switch (severity) {
      case 'critical':
        return 'CRITICAL ALARM';
      case 'warning':
        return 'WARNING';
      case 'info':
        return 'INFORMATION';
      default:
        return 'ALARM';
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      onDismiss?.(alarm.id);
    }, 300);
  };

  const handleAcknowledge = () => {
    setIsAcknowledged(true);
    onAcknowledge?.(alarm.id);
  };

  if (!isVisible) return null;

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-md w-full mx-4 transform transition-all duration-300 ${
      isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
    }`}>
      <div className={`border-l-4 rounded-lg shadow-lg ${getAlarmColor(alarm.severity)}`}>
        <div className="p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {getAlarmIcon(alarm.severity)}
            </div>
            <div className="ml-3 flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {getSeverityText(alarm.severity)}
                </h3>
                <div className="flex items-center space-x-2">
                  {!isAcknowledged && (
                    <button
                      onClick={handleAcknowledge}
                      className="text-xs bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Acknowledge
                    </button>
                  )}
                  <button
                    onClick={handleDismiss}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <div className="mt-1">
                <p className="text-sm text-gray-800 dark:text-gray-200 font-medium">
                  Crane {alarm.craneId}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {alarm.message}
                </p>
                
                {alarm.alarmType && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Type: {alarm.alarmType.replace('_', ' ').toUpperCase()}
                  </p>
                )}
                
                {alarm.parameters && Object.keys(alarm.parameters).length > 0 && (
                  <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                    <div className="font-medium">Details:</div>
                    {Object.entries(alarm.parameters).map(([key, value]) => (
                      <div key={key} className="ml-2">
                        {key}: {typeof value === 'number' ? value.toFixed(2) : value}
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {new Date(alarm.timestamp).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlarmNotification;
