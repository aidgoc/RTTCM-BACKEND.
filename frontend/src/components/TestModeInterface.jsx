import React, { useState, useEffect } from 'react';
import { useSocket } from '../lib/socket';
import { 
  PlayIcon, 
  StopIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  ClockIcon,
  WrenchScrewdriverIcon
} from '@heroicons/react/24/outline';

const TestModeInterface = ({ craneId, onClose }) => {
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [testType, setTestType] = useState('limit_switch_test');
  const [testResults, setTestResults] = useState(null);
  const [testHistory, setTestHistory] = useState([]);
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handleTestCompleted = (data) => {
      if (data.craneId === craneId) {
        setIsTestRunning(false);
        setTestResults(data.testResults);
        setTestHistory(prev => [{
          id: Date.now(),
          testType: data.testType,
          results: data.testResults,
          timestamp: data.timestamp,
          status: 'completed'
        }, ...prev.slice(0, 9)]); // Keep last 10 tests
      }
    };

    socket.on('crane:test_completed', handleTestCompleted);

    return () => {
      socket.off('crane:test_completed', handleTestCompleted);
    };
  }, [socket, craneId]);

  const startTest = () => {
    if (!socket) return;

    setIsTestRunning(true);
    setTestResults(null);

    // Send test command via MQTT (this would be handled by backend)
    socket.emit('crane:start_test', {
      craneId,
      testType,
      timestamp: new Date().toISOString()
    });

    // Add to history as started
    setTestHistory(prev => [{
      id: Date.now(),
      testType,
      results: null,
      timestamp: new Date().toISOString(),
      status: 'running'
    }, ...prev.slice(0, 9)]);
  };

  const stopTest = () => {
    if (!socket) return;

    setIsTestRunning(false);
    socket.emit('crane:stop_test', { craneId });
  };

  const getTestIcon = (testType) => {
    switch (testType) {
      case 'limit_switch_test':
        return <WrenchScrewdriverIcon className="h-5 w-5" />;
      case 'sli_test':
        return <CheckCircleIcon className="h-5 w-5" />;
      case 'system_test':
        return <PlayIcon className="h-5 w-5" />;
      default:
        return <PlayIcon className="h-5 w-5" />;
    }
  };

  const getTestStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case 'running':
        return <ClockIcon className="h-4 w-4 text-yellow-500" />;
      case 'failed':
        return <XCircleIcon className="h-4 w-4 text-red-500" />;
      default:
        return <ClockIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const getResultStatus = (results) => {
    if (!results) return 'unknown';
    
    const allPassed = Object.values(results).every(result => 
      result === 'PASS' || result === 'OK'
    );
    
    return allPassed ? 'completed' : 'failed';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-600">
          <div className="flex items-center space-x-3">
            <WrenchScrewdriverIcon className="h-6 w-6 text-blue-500" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              DRM3300 Test Mode - Crane {craneId}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <XCircleIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Test Controls */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Test Controls
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Test Type
                </label>
                <select
                  value={testType}
                  onChange={(e) => setTestType(e.target.value)}
                  disabled={isTestRunning}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-white"
                >
                  <option value="limit_switch_test">Limit Switch Test</option>
                  <option value="sli_test">Safe Load Indicator Test</option>
                  <option value="system_test">System Test</option>
                </select>
              </div>

              <div className="flex items-end space-x-2">
                {!isTestRunning ? (
                  <button
                    onClick={startTest}
                    className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                  >
                    <PlayIcon className="h-4 w-4" />
                    <span>Start Test</span>
                  </button>
                ) : (
                  <button
                    onClick={stopTest}
                    className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
                  >
                    <StopIcon className="h-4 w-4" />
                    <span>Stop Test</span>
                  </button>
                )}
              </div>
            </div>

            {isTestRunning && (
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-md">
                <div className="flex items-center space-x-2">
                  <ClockIcon className="h-5 w-5 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Test in progress... Please wait for completion.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Current Test Results */}
          {testResults && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Latest Test Results
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(testResults).map(([key, value]) => (
                  <div key={key} className="text-center">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      {key.toUpperCase()}
                    </div>
                    <div className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium ${
                      value === 'PASS' || value === 'OK' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {value === 'PASS' || value === 'OK' ? (
                        <CheckCircleIcon className="h-4 w-4" />
                      ) : (
                        <XCircleIcon className="h-4 w-4" />
                      )}
                      <span>{value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Test History */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Test History
            </h3>
            
            {testHistory.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                No tests performed yet
              </p>
            ) : (
              <div className="space-y-2">
                {testHistory.map((test) => (
                  <div key={test.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getTestIcon(test.testType)}
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {test.testType.replace('_', ' ').toUpperCase()}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(test.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {getTestStatusIcon(test.status)}
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {test.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestModeInterface;
