import { useState } from 'react';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ExclamationTriangleIcon,
  ClockIcon,
  WrenchScrewdriverIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

export default function LimitTestCard({ test, userRole, onEdit, onDelete }) {
  const [isHovered, setIsHovered] = useState(false);
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'passed':
        return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900';
      case 'failed':
        return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900';
      case 'partial':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900';
      case 'in_progress':
        return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'passed':
        return <CheckCircleIcon className="h-5 w-5" />;
      case 'failed':
        return <XCircleIcon className="h-5 w-5" />;
      case 'partial':
        return <ExclamationTriangleIcon className="h-5 w-5" />;
      case 'in_progress':
        return <ClockIcon className="h-5 w-5" />;
      default:
        return <ClockIcon className="h-5 w-5" />;
    }
  };

  const getTestTypeColor = (type) => {
    switch (type) {
      case 'scheduled':
        return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900';
      case 'manual':
        return 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900';
      case 'automatic':
        return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900';
      case 'emergency':
        return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800';
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDaysUntilNext = (nextTestDue) => {
    const now = new Date();
    const next = new Date(nextTestDue);
    const diffTime = next - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntilNext = getDaysUntilNext(test.nextTestDue);
  const isOverdue = daysUntilNext < 0;

  return (
    <div 
      className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg transition-all duration-300 cursor-pointer group relative overflow-hidden ${
        isHovered ? 'shadow-2xl transform scale-[1.02] border-blue-500 dark:border-blue-400' : 'hover:shadow-xl hover:scale-[1.02] hover:border-blue-400 dark:hover:border-blue-500'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white font-orbitron group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors duration-300">
              {test.craneId}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 font-mono group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md inline-block group-hover:bg-blue-100 dark:group-hover:bg-blue-900">
              {formatDate(test.testDate)}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs transition-all duration-300 group-hover:scale-110 ${
              getStatusColor(test.testStatus)
            }`}>
              {getStatusIcon(test.testStatus)}
              <span className="font-medium capitalize">{test.testStatus}</span>
            </div>
            <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs transition-all duration-300 group-hover:scale-110 ${
              getTestTypeColor(test.testType)
            }`}>
              <span className="font-medium capitalize">{test.testType}</span>
            </div>
          </div>
        </div>

        {/* Test Results Summary */}
        <div className="mb-3">
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-1">
              <div className={`w-2 h-2 rounded-full ${
                test.testResults.overallPassed ? 'bg-green-400' : 'bg-red-400'
              }`}></div>
              <span className="text-gray-600 dark:text-gray-300 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors duration-300">
                {test.testResults.overallPassed ? 'Passed' : 'Failed'}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <WrenchScrewdriverIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              <span className="text-gray-600 dark:text-gray-300 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors duration-300">
                {test.testDuration} min
              </span>
            </div>
            {test.maintenanceRequired && (
              <div className="flex items-center space-x-1 text-red-600 dark:text-red-400">
                <ExclamationTriangleIcon className="h-4 w-4" />
                <span className="text-xs font-medium">Maintenance Required</span>
              </div>
            )}
          </div>
        </div>

        {/* Pre-Operation Limit Switch Tests */}
        <div className="mb-3">
          <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors duration-300">
            Pre-Operation Tests
          </h4>
          <div className="flex justify-center space-x-4">
            {Object.entries(test.limitSwitches).map(([key, switchData]) => (
              <div key={key} className="flex flex-col items-center">
                <span className="text-xs text-gray-600 dark:text-gray-300 uppercase font-bold font-mono group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors duration-300 mb-1">
                  {key}
                </span>
                <div className={`w-4 h-4 rounded-full transition-all duration-300 group-hover:scale-110 ${
                  switchData.status === 'OK' ? 'bg-green-400 group-hover:bg-green-500' :
                  switchData.status === 'FAIL' ? 'bg-red-400 group-hover:bg-red-500' :
                  'bg-gray-500 group-hover:bg-gray-600'
                }`}></div>
              </div>
            ))}
          </div>
        </div>

        {/* Actual Operation Limit Test Results */}
        <div className="mb-3">
          <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors duration-300">
            Operation Test Results
          </h4>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 group-hover:bg-gray-100 dark:group-hover:bg-gray-600 transition-colors duration-300">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="flex flex-col items-center">
                <div className="text-lg font-bold text-gray-800 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors duration-300">
                  {Object.values(test.limitSwitches).filter(sw => sw.status === 'OK').length}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-300">
                  Passed
                </div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-lg font-bold text-gray-800 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors duration-300">
                  {Object.values(test.limitSwitches).filter(sw => sw.status === 'FAIL').length}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-300">
                  Failed
                </div>
              </div>
            </div>
            <div className="mt-2 text-center">
              <div className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors duration-300">
                Avg Response: {Math.round(Object.values(test.limitSwitches).reduce((sum, sw) => sum + (sw.responseTime || 0), 0) / Object.keys(test.limitSwitches).length)}ms
              </div>
            </div>
          </div>
        </div>

        {/* Utility Test */}
        <div className="mb-3">
          <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors duration-300">
            Utility Test
          </h4>
          <div className="flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-gray-700 group-hover:bg-gray-100 dark:group-hover:bg-gray-600 transition-colors duration-300">
            <span className="text-sm text-gray-600 dark:text-gray-300 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors duration-300">
              Status: {test.utilityTest.status}
            </span>
            {test.utilityTest.powerLevel && (
              <span className="text-sm text-gray-600 dark:text-gray-300 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors duration-300">
                Power: {test.utilityTest.powerLevel}%
              </span>
            )}
          </div>
        </div>

        {/* Next Test Due */}
        <div className="mb-3 pt-2 border-t border-gray-200 dark:border-gray-600 group-hover:border-cyan-200 dark:group-hover:border-cyan-600 transition-colors duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1 text-xs text-gray-600 dark:text-gray-300 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors duration-300">
              <CalendarIcon className="h-3 w-3" />
              <span className="font-medium">Next Test</span>
            </div>
            <div className={`text-xs font-bold ${
              isOverdue ? 'text-red-600 dark:text-red-400' : 
              daysUntilNext <= 7 ? 'text-yellow-600 dark:text-yellow-400' : 
              'text-green-600 dark:text-green-400'
            }`}>
              {isOverdue ? `${Math.abs(daysUntilNext)} days overdue` : 
               daysUntilNext === 0 ? 'Due today' :
               `${daysUntilNext} days`}
            </div>
          </div>
        </div>

        {/* Actions */}
        {(userRole === 'admin' || userRole === 'manager') && (
          <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-600 group-hover:border-cyan-200 dark:group-hover:border-cyan-600 transition-colors duration-300">
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors duration-300">
                {test.performedBy?.name || 'System Generated'}
              </div>
              <div className="flex space-x-2">
                {onEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(test);
                    }}
                    className="text-xs px-3 py-1 text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 hover:bg-cyan-50 dark:hover:bg-cyan-900 rounded transition-all duration-300 group-hover:scale-105"
                  >
                    Edit
                  </button>
                )}
                {onDelete && userRole === 'admin' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(test);
                    }}
                    className="text-xs px-3 py-1 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900 rounded transition-all duration-300 group-hover:scale-105"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
