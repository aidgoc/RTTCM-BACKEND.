import React, { useState, useEffect } from 'react';
import { useSocket } from '../lib/socket';
import AlarmNotification from './AlarmNotification';
import { BellIcon, XMarkIcon } from '@heroicons/react/24/outline';

const AlarmManager = () => {
  const [alarms, setAlarms] = useState([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    // Listen for DRM3300 alarm events
    const handleAlarm = (alarmData) => {
      const newAlarm = {
        id: `${alarmData.craneId}-${Date.now()}`,
        craneId: alarmData.craneId,
        alarmType: alarmData.alarmType,
        severity: alarmData.severity,
        message: alarmData.message,
        timestamp: alarmData.timestamp || new Date().toISOString(),
        parameters: alarmData.parameters || {}
      };

      setAlarms(prev => [newAlarm, ...prev.slice(0, 4)]); // Keep only 5 most recent alarms
    };

    // Listen for test completion events
    const handleTestCompleted = (testData) => {
      const testAlarm = {
        id: `test-${testData.craneId}-${Date.now()}`,
        craneId: testData.craneId,
        alarmType: 'test_completed',
        severity: 'info',
        message: `${testData.testType.replace('_', ' ')} test completed`,
        timestamp: testData.timestamp || new Date().toISOString(),
        parameters: testData.testResults || {}
      };

      setAlarms(prev => [testAlarm, ...prev.slice(0, 4)]);
    };

    socket.on('crane:alarm_triggered', handleAlarm);
    socket.on('crane:test_completed', handleTestCompleted);

    return () => {
      socket.off('crane:alarm_triggered', handleAlarm);
      socket.off('crane:test_completed', handleTestCompleted);
    };
  }, [socket]);

  const handleDismiss = (alarmId) => {
    setAlarms(prev => prev.filter(alarm => alarm.id !== alarmId));
  };

  const handleAcknowledge = (alarmId) => {
    setAlarms(prev => 
      prev.map(alarm => 
        alarm.id === alarmId 
          ? { ...alarm, acknowledged: true }
          : alarm
      )
    );
  };

  const clearAllAlarms = () => {
    setAlarms([]);
  };

  if (alarms.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {/* Alarm Header */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 border border-gray-200 dark:border-gray-600">
        <div className="flex items-center space-x-2">
          <BellIcon className="h-5 w-5 text-red-500" />
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Active Alarms ({alarms.length})
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            {isMinimized ? (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            )}
          </button>
          <button
            onClick={clearAllAlarms}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Alarm Notifications */}
      {!isMinimized && (
        <div className="space-y-2">
          {alarms.map((alarm) => (
            <AlarmNotification
              key={alarm.id}
              alarm={alarm}
              onDismiss={handleDismiss}
              onAcknowledge={handleAcknowledge}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AlarmManager;
