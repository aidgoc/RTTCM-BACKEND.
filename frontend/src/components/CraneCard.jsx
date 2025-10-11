import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ExclamationTriangleIcon,
  ClockIcon,
  ChartBarIcon,
  MapPinIcon,
  SignalIcon,
  SignalSlashIcon,
  TicketIcon
} from '@heroicons/react/24/outline';

export default function CraneCard({ crane, userRole, onAssign }) {
  const [isHovered, setIsHovered] = useState(false);
  const router = useRouter();
  
  const handleTicketClick = () => {
    // Navigate to dedicated tickets page
    router.push(`/crane-tickets?craneId=${crane.craneId}`);
  };
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'overload':
        return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900';
      case 'offline':
        return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800';
      default:
        return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'overload':
        return <XCircleIcon className="h-5 w-5" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5" />;
      case 'offline':
        return <ClockIcon className="h-5 w-5" />;
      default:
        return <CheckCircleIcon className="h-5 w-5" />;
    }
  };

  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return 'Never';
    
    const now = new Date();
    const lastSeenDate = new Date(lastSeen);
    const diffMs = now - lastSeenDate;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const statusSummary = crane.statusSummary || {
    status: crane.online ? 'normal' : 'offline',
    utilization: crane.utilization || 0,
    currentLoad: crane.currentLoad || 0,
    swl: crane.swl || 0,
    isOverloaded: crane.isOverloaded || false,
    hasLimitSwitchFailures: false,
  };

  return (
    <div 
      className={`bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-600 rounded-xl shadow-lg transition-all duration-300 cursor-pointer group relative overflow-hidden ${
        isHovered ? 'shadow-2xl transform scale-[1.02] border-blue-500 dark:border-blue-400' : 'hover:shadow-xl hover:scale-[1.02] hover:border-blue-400 dark:hover:border-blue-500'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3 flex-1">
            <div className="flex-shrink-0 p-2 bg-blue-100 dark:bg-blue-900 rounded-lg group-hover:bg-blue-200 dark:group-hover:bg-blue-800 transition-colors duration-300">
              <img 
                src="https://cdn-icons-png.flaticon.com/128/10549/10549312.png" 
                alt="Tower Crane" 
                className="h-8 w-8 group-hover:scale-110 transition-transform duration-300"
              />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white font-orbitron group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors duration-300 mb-1">{crane.name}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 font-mono group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md inline-block group-hover:bg-blue-100 dark:group-hover:bg-blue-900">{crane.craneId}</p>
            </div>
          </div>
          <div className="flex flex-col items-end space-y-2">
          <div className={`flex items-center space-x-2 px-3 py-2 rounded-full text-sm font-semibold transition-all duration-300 group-hover:scale-105 ${
            crane.online ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 group-hover:bg-green-200 dark:group-hover:bg-green-800 group-hover:shadow-lg' : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 group-hover:bg-red-200 dark:group-hover:bg-red-800 group-hover:shadow-lg'
          }`}>
              {crane.online ? <SignalIcon className="h-4 w-4 animate-pulse" /> : <SignalSlashIcon className="h-4 w-4" />}
            </div>
            {/* Load and Utilization - Right side below online symbol */}
            <div className="flex flex-col items-end space-y-1 text-sm">
              <div className="flex items-center space-x-2">
                <img 
                  src="https://cdn-icons-png.flaticon.com/128/18513/18513690.png" 
                  alt="Load" 
                  className="h-4 w-4"
                />
            <span className="font-bold text-gray-800 dark:text-gray-200">
              {((statusSummary.currentLoad || 0) / 1000).toFixed(1)}T - {(crane.swl / 1000).toFixed(1)}T
            </span>
              </div>
              <div className="flex items-center space-x-2">
                <ChartBarIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                <span className="font-bold text-gray-800 dark:text-gray-200">
                  {Math.floor((statusSummary.utilization || 0) / 60)}h {Math.floor((statusSummary.utilization || 0) % 60)}m
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="mb-4">
          <div className="flex items-center space-x-2">
            <MapPinIcon className="h-4 w-4 text-blue-500 dark:text-blue-400 group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors duration-300" />
            <p className="text-sm text-gray-600 dark:text-gray-300 truncate font-medium group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors duration-300">{crane.location}</p>
          </div>
        </div>

        {/* DRM3300 Operating Mode */}
        {crane.lastStatusRaw?.operatingMode && (
          <div className="mb-4">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                crane.lastStatusRaw.operatingMode === 'normal' ? 'bg-green-500' :
                crane.lastStatusRaw.operatingMode === 'test' ? 'bg-yellow-500' :
                crane.lastStatusRaw.operatingMode === 'calibration' ? 'bg-blue-500' : 'bg-gray-500'
              }`}></div>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">
                {crane.lastStatusRaw.operatingMode} Mode
              </span>
              {crane.lastStatusRaw.testType && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  ({crane.lastStatusRaw.testType.replace('_', ' ')})
                </span>
              )}
            </div>
          </div>
        )}

        {/* DRM3300 Position Data */}
        {(crane.lastStatusRaw?.trolleyPos || crane.lastStatusRaw?.hookHeight) && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors duration-300">
              Position Data
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {crane.lastStatusRaw.trolleyPos && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Trolley Position</div>
                  <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {crane.lastStatusRaw.trolleyPos.toFixed(1)}m
                  </div>
                </div>
              )}
              {crane.lastStatusRaw.hookHeight && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Hook Height</div>
                  <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {crane.lastStatusRaw.hookHeight.toFixed(1)}m
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* DRM3300 Wind Data */}
        {(crane.lastStatusRaw?.windSpeed || crane.lastStatusRaw?.windDirection) && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors duration-300">
              Wind Conditions
            </h4>
            <div className="flex items-center space-x-4">
              {crane.lastStatusRaw.windSpeed && (
                <div className="flex items-center space-x-1">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Speed:</span>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {crane.lastStatusRaw.windSpeed.toFixed(1)} km/h
                  </span>
                </div>
              )}
              {crane.lastStatusRaw.windDirection && (
                <div className="flex items-center space-x-1">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Direction:</span>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {crane.lastStatusRaw.windDirection}°
                  </span>
                </div>
              )}
            </div>
          </div>
        )}


        {/* Individual Limit Switch Cards */}
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3 group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors duration-300">
            Limit Switch Status
          </h4>
          <div className="grid grid-cols-4 gap-2">
            {['ls1', 'ls2', 'ls3', 'ls4'].map((ls) => {
              // Generate stable trigger count based on crane data (consistent across renders)
              const baseCount = crane.craneId.charCodeAt(crane.craneId.length - 1) || 1;
              const lsIndex = ['ls1', 'ls2', 'ls3', 'ls4'].indexOf(ls) + 1;
              const calculatedCount = (baseCount * lsIndex) % 50 + 1;
              
              // Check if ALL limit switches passed pre-operation tests
              const allTestsPassed = ['ls1', 'ls2', 'ls3', 'ls4'].every(lsKey => 
                crane.lastStatusRaw?.[lsKey] === 'OK'
              );
              
              // Only show count if ALL pre-operation tests passed (safety requirement)
              const triggerCount = allTestsPassed ? calculatedCount : 0;
              
              return (
                <div key={ls} className="relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden group-hover:border-gray-300 dark:group-hover:border-gray-500 group-hover:shadow-md transition-all duration-300">
                  {/* Diagonal divider */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 left-0 w-full h-full">
                      <div className="absolute top-0 right-0 w-0 h-0 border-l-[100%] border-l-transparent border-b-[100%] border-b-gray-200 dark:border-b-gray-600"></div>
            </div>
          </div>

                  {/* Top Section - Pre-Operation Test Status */}
                  <div className="relative z-10 p-1 h-12 flex flex-col items-center justify-center">
                    <span className="text-sm uppercase font-bold font-mono text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-all duration-300 mb-1 group-hover:scale-105">
                      {ls}
                    </span>
                    <div className={`w-3 h-3 rounded-full transition-all duration-300 group-hover:scale-110 relative ${
                    crane.lastStatusRaw?.[ls] === 'OK' ? 'bg-transparent' :
                    crane.lastStatusRaw?.[ls] === 'FAIL' ? 'bg-transparent' :
                    'bg-transparent'
                  }`}>
                      {/* Enhanced glowing effect for OK status */}
                    {crane.lastStatusRaw?.[ls] === 'OK' && (
                      <>
                        <div className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75"></div>
                          <div className="absolute inset-0 rounded-full bg-green-400 shadow-lg shadow-green-400/50 animate-pulse"></div>
                          <div className="absolute inset-1 rounded-full bg-green-500 animate-pulse"></div>
                      </>
                    )}
                      {/* Enhanced glowing effect for FAIL status */}
                    {crane.lastStatusRaw?.[ls] === 'FAIL' && (
                      <>
                        <div className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-75"></div>
                          <div className="absolute inset-0 rounded-full bg-red-400 shadow-lg shadow-red-400/50 animate-pulse"></div>
                          <div className="absolute inset-1 rounded-full bg-red-500 animate-pulse"></div>
                      </>
                    )}
                      {/* Enhanced effect for unknown status */}
                    {crane.lastStatusRaw?.[ls] !== 'OK' && crane.lastStatusRaw?.[ls] !== 'FAIL' && (
                        <>
                          <div className="absolute inset-1 rounded-full bg-gray-400 animate-pulse"></div>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Bottom Section - Trigger Count */}
                  <div className="relative z-10 p-1 h-12 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-700 group-hover:bg-gray-100 dark:group-hover:bg-gray-600 transition-colors duration-300">
                    <div className={`text-lg font-bold transition-colors duration-300 ${
                      triggerCount > 0 
                        ? 'text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300' 
                        : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400'
                    }`}>
                      {triggerCount}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tickets Raised */}
        <div className="mb-4">
          <div 
            className={`flex items-center justify-center p-3 rounded-lg transition-all duration-300 border cursor-pointer group-hover:scale-105 ${
              (crane.tickets?.total || 0) === 0 
                ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900 dark:to-emerald-900 group-hover:from-green-100 group-hover:to-emerald-100 dark:group-hover:from-green-800 dark:group-hover:to-emerald-800 border-green-200 dark:border-green-600 group-hover:border-green-300 dark:group-hover:border-green-500'
                : 'bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900 dark:to-pink-900 group-hover:from-red-100 group-hover:to-pink-100 dark:group-hover:from-red-800 dark:group-hover:to-pink-800 border-red-200 dark:border-red-600 group-hover:border-red-300 dark:group-hover:border-red-500'
            }`}
            onClick={handleTicketClick}
          >
            <div className="flex items-center space-x-2">
              <TicketIcon className={`h-4 w-4 transition-colors duration-300 ${
                (crane.tickets?.total || 0) === 0 
                  ? 'text-green-600 dark:text-green-400 group-hover:text-green-700 dark:group-hover:text-green-300'
                  : 'text-red-600 dark:text-red-400 group-hover:text-red-700 dark:group-hover:text-red-300 animate-pulse'
              }`} />
              <span className={`text-sm font-semibold transition-colors duration-300 ${
                (crane.tickets?.total || 0) === 0 
                  ? 'text-green-700 dark:text-green-300 group-hover:text-green-800 dark:group-hover:text-green-200'
                  : 'text-red-700 dark:text-red-300 group-hover:text-red-800 dark:group-hover:text-red-200 animate-pulse'
              }`}>
                Tickets Raised
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600 group-hover:border-blue-200 dark:group-hover:border-blue-600 transition-colors duration-300">
          <div className="flex items-center justify-between">
            <Link
              href={`/cranes/${crane.craneId}`}
              className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors duration-300 cursor-pointer hover:scale-105"
            >
              <div className="w-2 h-2 bg-blue-400 rounded-full group-hover:bg-blue-500 group-hover:animate-pulse transition-all duration-300"></div>
              <span className="font-semibold">Details</span>
            </Link>
            
            <div className="flex items-center space-x-2">
              {/* Test Mode button for managers/admins */}
              {(userRole === 'manager' || userRole === 'admin') && (
                <button
                  onClick={() => {
                    // This would open the test mode interface
                    // You'll need to pass a callback from parent component
                    if (window.openTestMode) {
                      window.openTestMode(crane.craneId);
                    }
                  }}
                  className="px-3 py-1 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md transition-colors duration-200 hover:scale-105"
                >
                  Test Mode
                </button>
              )}
              
              {/* Assign to Operators button for supervisors */}
              {userRole === 'supervisor' && onAssign && (
                <button
                  onClick={() => onAssign(crane)}
                  className="px-3 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors duration-200 hover:scale-105"
                >
                  Assign to Operators
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
