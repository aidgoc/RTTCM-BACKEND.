import React, { useState, useEffect } from 'react';
import { useSocket } from '../lib/socket';
import { cranesAPI } from '../lib/api';
import { 
  CheckCircleIcon, 
  XCircleIcon,
  ClockIcon,
  WrenchScrewdriverIcon,
  DocumentChartBarIcon
} from '@heroicons/react/24/outline';

const TestResultsViewer = ({ craneId, onClose }) => {
  const [testResults, setTestResults] = useState(null);
  const [testHistory, setTestHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();

  // Fetch test history from backend
  useEffect(() => {
    const fetchTestHistory = async () => {
      try {
        console.log(`[TestResults] Fetching test history for crane: ${craneId}`);
        setLoading(true);
        
        const response = await cranesAPI.getTestHistory(craneId);
        console.log('[TestResults] API Response:', response);
        
        if (response.data) {
          console.log('[TestResults] Test data:', response.data);
          setTestHistory(response.data.tests || []);
          // Set the most recent test as current result
          if (response.data.tests && response.data.tests.length > 0) {
            setTestResults(response.data.tests[0].testResults);
            console.log('[TestResults] Latest test results:', response.data.tests[0].testResults);
          } else {
            console.log('[TestResults] No test data found');
          }
        }
      } catch (error) {
        console.error('[TestResults] Error fetching test history:', error);
        console.error('[TestResults] Error details:', error.response?.data || error.message);
        
        // Show error to user
        if (error.response?.status === 403) {
          console.error('[TestResults] Access denied - 403 Forbidden');
        } else if (error.response?.status === 401) {
          console.error('[TestResults] Not authenticated - 401 Unauthorized');
        }
      } finally {
        console.log('[TestResults] Loading complete');
        setLoading(false);
      }
    };

    fetchTestHistory();
  }, [craneId]);

  // Listen for real-time test updates from MQTT
  useEffect(() => {
    if (!socket) return;

    const handleTestCompleted = (data) => {
      if (data.craneId === craneId) {
        setTestResults(data.testResults);
        setTestHistory(prev => [{
          id: Date.now(),
          testType: data.testType,
          testResults: data.testResults,
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
            <DocumentChartBarIcon className="h-6 w-6 text-blue-500" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Test Results - Crane {craneId}
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
          {/* Info Notice */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <WrenchScrewdriverIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-1">
                  Hardware-Initiated Tests Only
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  All tests must be initiated from the DRM3300 device. Results will appear here automatically in real-time via MQTT.
                </p>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600 dark:text-gray-400">Loading test results...</span>
            </div>
          )}

          {/* Current Test Results */}
          {!loading && testResults && (
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
          {!loading && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Test History
              </h3>
              
              {testHistory.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                  No tests performed yet. Tests initiated from the DRM3300 device will appear here.
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
          )}
        </div>
      </div>
    </div>
  );
};

export default TestResultsViewer;
