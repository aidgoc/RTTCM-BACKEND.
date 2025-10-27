import React, { useState, useMemo } from 'react';
import StatusBadge from './common/StatusBadge';
import StatusIcon from './common/StatusIcon';
import { formatLoad, formatUtilization, getStatusConfig } from '../utils/formatters';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ComposedChart, Area, ReferenceLine } from 'recharts';
import { 
  WifiIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  ExclamationTriangleIcon,
  ChartBarIcon,
  ArrowUpIcon
} from '@heroicons/react/24/outline';

const CraneCardModal = ({ crane, isOpen, onClose, onAnalyticsClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  
  // Get wind speed from crane data or show no data
  const getWindSpeed = () => {
    return crane?.windSpeed || 0; // Use real wind speed data from crane
  };
  
  // Memoized calculations to prevent re-computation
  const statusConfig = useMemo(() => crane ? getStatusConfig(crane) : null, [crane]);
  const limitSwitches = useMemo(() => 
    crane ? ['ls1', 'ls2', 'ls3', 'ls4'].map(ls => ({
      key: ls,
      status: crane.lastStatusRaw?.[ls] || 'UNKNOWN',
      triggerCount: crane.lastStatusRaw?.[ls] === 'OK' ? 
        ((crane.craneId?.charCodeAt(crane.craneId.length - 1) || 1) * (['ls1', 'ls2', 'ls3', 'ls4'].indexOf(ls) + 1)) % 50 + 1 : 0
    })) : [], [crane]
  );

  // Get real utilization trend data from crane or return empty
  const generateUtilizationTrend = () => {
    if (!crane) return [];
    
    // Return real data from crane if available, otherwise empty array
    return crane.utilizationTrend || [];
  };

  const generatePeakLoadTrend = () => {
    if (!crane) return [];
    
    // Return real data from crane if available, otherwise empty array
    return crane.peakLoadTrend || [];
  };

  const generateHistoricalData = () => {
    if (!crane) return [];
    
    // Return real data from crane if available, otherwise empty array
    return crane.historicalData || [];
  };

  // Chart data
  const utilizationTrendData = crane ? generateUtilizationTrend() : [];
  const peakLoadTrendData = crane ? generatePeakLoadTrend() : [];
  const historicalData = crane ? generateHistoricalData() : [];

  // Debug logging
  if (crane && peakLoadTrendData.length > 0) {
    console.log('Peak Load Trend Data:', peakLoadTrendData);
  }

  const currentLoad = crane?.currentLoad || 0;
  const swl = crane?.swl || 100;
  const utilization = crane?.utilization || 0;
  const isOverloaded = currentLoad > swl;

  if (!isOpen || !crane) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 !z-[99999]"
      style={{ zIndex: 99999 }}
      onClick={onClose}
    >
      <div 
        className={`bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-600 rounded-xl shadow-lg transition-all duration-300 cursor-pointer group relative overflow-hidden ${showAnalytics ? 'max-w-5xl w-[90vw]' : 'max-w-lg w-full'} max-h-[90vh] overflow-y-auto !z-[100000] ${
          isHovered ? 'shadow-2xl transform scale-[1.02] border-blue-500 dark:border-blue-400' : 'hover:shadow-xl hover:scale-[1.02] hover:border-blue-400 dark:hover:border-blue-500'
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={(e) => e.stopPropagation()}
        style={{ zIndex: 100000, position: 'relative' }}
      >
        {/* Header with Close Button */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-600">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
              {showAnalytics ? 'Crane Analytics' : 'Crane Details'}
            </h2>
            {showAnalytics && (
              <button
                onClick={() => setShowAnalytics(false)}
                className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
              >
                ← Back to Details
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl transition-colors duration-200"
          >
            ×
          </button>
        </div>

        <div className="p-4">
          {!showAnalytics ? (
            <>
              {/* Crane Card View */}
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
                <h3 className="text-xl font-bold text-gray-900 dark:text-white font-orbitron group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors duration-300 mb-1">
                  {crane.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 font-mono group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md inline-block group-hover:bg-blue-100 dark:group-hover:bg-blue-900">
                  {crane.craneId}
                </p>
              </div>
            </div>
            
            <div className="flex flex-col items-end space-y-2">
              <StatusBadge 
                isOnline={crane.online} 
                className="group-hover:scale-105 transition-all duration-300"
              />
              <div className="flex flex-col items-end space-y-1 text-sm">
                <div className="flex items-center space-x-2">
                  <img src="https://cdn-icons-png.flaticon.com/128/18513/18513690.png" alt="Load" className="h-4 w-4" />
                  <span className="font-bold text-gray-800 dark:text-gray-200">
                    {formatLoad(crane.currentLoad, crane.swl)}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <svg className="h-4 w-4 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                  </svg>
                  <span className="font-bold text-gray-800 dark:text-gray-200">
                    {formatUtilization(crane.utilization)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="mb-4">
            <div className="flex items-center space-x-2">
              <svg className="h-4 w-4 text-blue-500 dark:text-blue-400 group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-sm text-gray-600 dark:text-gray-300 truncate font-medium group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors duration-300">
                {crane.location}
              </p>
            </div>
          </div>

          {/* Wind Speed */}
          <div className="mb-4">
            <div className="bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900 dark:to-blue-900 border border-cyan-200 dark:border-cyan-600 rounded-lg p-3 group-hover:from-cyan-100 group-hover:to-blue-100 dark:group-hover:from-cyan-800 dark:group-hover:to-blue-800 group-hover:border-cyan-300 dark:group-hover:border-cyan-500 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <svg className="h-5 w-5 text-cyan-600 dark:text-cyan-400 group-hover:text-cyan-700 dark:group-hover:text-cyan-300 transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                  <span className="text-sm font-semibold text-cyan-700 dark:text-cyan-300 group-hover:text-cyan-800 dark:group-hover:text-cyan-200 transition-colors duration-300">
                    Wind Speed
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`text-2xl font-bold transition-colors duration-300 ${
                    (crane.lastStatusRaw?.windSpeed || getWindSpeed()) > 20 
                      ? 'text-red-600 dark:text-red-400 group-hover:text-red-700 dark:group-hover:text-red-300' 
                      : (crane.lastStatusRaw?.windSpeed || getWindSpeed()) > 15 
                      ? 'text-yellow-600 dark:text-yellow-400 group-hover:text-yellow-700 dark:group-hover:text-yellow-300'
                      : 'text-green-600 dark:text-green-400 group-hover:text-green-700 dark:group-hover:text-green-300'
                  }`}>
                    {(crane.lastStatusRaw?.windSpeed || getWindSpeed()).toFixed(1)}
                  </div>
                  <span className="text-sm text-cyan-600 dark:text-cyan-400 group-hover:text-cyan-700 dark:group-hover:text-cyan-300 transition-colors duration-300 font-medium">
                    km/h
                  </span>
                </div>
              </div>
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-cyan-600 dark:text-cyan-400 group-hover:text-cyan-700 dark:group-hover:text-cyan-300 transition-colors duration-300">
                  <span>Safe: 0-15 km/h</span>
                  <span>Caution: 15-20 km/h</span>
                  <span>Danger: 20+ km/h</span>
                </div>
                <div className="mt-1 w-full bg-cyan-200 dark:bg-cyan-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${
                      (crane.lastStatusRaw?.windSpeed || getWindSpeed()) > 20 
                        ? 'bg-red-500' 
                        : (crane.lastStatusRaw?.windSpeed || getWindSpeed()) > 15 
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{ 
                      width: `${Math.min(((crane.lastStatusRaw?.windSpeed || getWindSpeed()) / 30) * 100, 100)}%` 
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Limit Switch Cards */}
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3 group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors duration-300">
              Limit Switch Status
            </h4>
            <div className="grid grid-cols-4 gap-2">
              {limitSwitches.map(({ key, status, triggerCount }) => (
                <div key={key} className="relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden group-hover:border-gray-300 dark:group-hover:border-gray-500 group-hover:shadow-md transition-all duration-300">
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 right-0 w-0 h-0 border-l-[100%] border-l-transparent border-b-[100%] border-b-gray-200 dark:border-b-gray-600"></div>
                  </div>
                  
                  <div className="relative z-10 p-1 h-12 flex flex-col items-center justify-center">
                    <span className="text-sm uppercase font-bold font-mono text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-all duration-300 mb-1 group-hover:scale-105">
                      {key}
                    </span>
                    <StatusIcon status={status} className="w-3 h-3" />
                  </div>
                  
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
              ))}
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
              onClick={() => window.open(`/crane-tickets?craneId=${crane.craneId}`, '_blank')}
            >
              <div className="flex items-center space-x-2">
                <svg className={`h-4 w-4 transition-colors duration-300 ${
                  (crane.tickets?.total || 0) === 0 
                    ? 'text-green-600 dark:text-green-400 group-hover:text-green-700 dark:group-hover:text-green-300'
                    : 'text-red-600 dark:text-red-400 group-hover:text-red-700 dark:group-hover:text-red-300 animate-pulse'
                }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
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
            <div className="flex items-center justify-center">
              <div 
                className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors duration-300 cursor-pointer hover:scale-105"
                onClick={() => setShowAnalytics(true)}
              >
                <div className="w-2 h-2 bg-blue-400 rounded-full group-hover:bg-blue-500 group-hover:animate-pulse transition-all duration-300"></div>
                <span className="font-semibold">Details</span>
              </div>
            </div>
          </div>
            </>
          ) : (
            <>
              {/* Analytics View */}
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{crane.name}</h1>
                    <p className="text-gray-600 dark:text-gray-300 mt-1">{crane.craneId} • {crane.location}</p>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium ${
                      crane.online 
                        ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                        : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                    }`}>
                      <WifiIcon className={`h-4 w-4 ${crane.online ? 'text-green-600 dark:text-green-400 animate-pulse' : 'text-red-600 dark:text-red-400'}`} />
                      <span>{crane.online ? 'Online' : 'Offline'}</span>
                    </div>
                  </div>
                </div>

                {/* Real-time Status Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Connection Status */}
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Connection Status</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <div className={`w-2 h-2 rounded-full ${crane.online ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                          <span className="text-lg font-semibold text-gray-900 dark:text-white">
                            {crane.online ? 'Online' : 'Offline'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Last seen {crane.lastSeen 
                            ? new Date(crane.lastSeen).toLocaleTimeString()
                            : 'Never'
                          }
                        </p>
                      </div>
                      <WifiIcon className={`h-8 w-8 ${crane.online ? 'text-green-500 animate-pulse' : 'text-red-500'}`} />
                    </div>
                  </div>

                  {/* Limit Switches */}
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-6">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Limit Switches</p>
                      <div className="grid grid-cols-2 gap-2">
                        {['ls1', 'ls2', 'ls3', 'ls4'].map((ls) => {
                          const status = crane.lastStatusRaw?.[ls] || 'UNKNOWN';
                          const isOk = status === 'OK';
                          return (
                            <div key={ls} className="flex items-center space-x-2">
                              <div className={`w-2 h-2 rounded-full ${isOk ? 'bg-green-400' : 'bg-red-400'}`}></div>
                              <span className="text-xs font-medium text-gray-900 dark:text-white uppercase">{ls}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Load Status */}
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-6">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Load Status</p>
                      <div className="flex items-baseline space-x-2">
                        <span className={`text-2xl font-bold ${isOverloaded ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                          {currentLoad}t
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">/ {swl}t</span>
                      </div>
                      <div className="mt-3">
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${
                              isOverloaded 
                                ? 'bg-red-500' 
                                : currentLoad / swl > 0.8 
                                  ? 'bg-yellow-500' 
                                  : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min((currentLoad / swl) * 100, 100)}%` }}
                          ></div>
                        </div>
                        {isOverloaded && (
                          <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">Overloaded!</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Utilization */}
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-6">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Utilization (Current)</p>
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">{utilization}%</span>
                        <ArrowUpIcon className="h-4 w-4 text-green-500" />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Last 24 hours</p>
                    </div>
                  </div>
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Utilization Trend Chart */}
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center space-x-2">
                        <ChartBarIcon className="h-5 w-5 text-blue-500" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Utilization Trend (24h)</h3>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={utilizationTrendData}>
                            <XAxis 
                              dataKey="time" 
                              tick={{ fontSize: 12, fill: '#6B7280' }}
                              axisLine={{ stroke: '#374151' }}
                              tickFormatter={(value, index) => {
                                return utilizationTrendData[index]?.displayTime || '';
                              }}
                            />
                            <YAxis 
                              tick={{ fontSize: 12, fill: '#6B7280' }}
                              domain={[0, 100]}
                              tickFormatter={(value) => `${value}%`}
                              axisLine={{ stroke: '#374151' }}
                              ticks={[0, 25, 50, 75, 100]}
                            />
                            <Tooltip 
                              formatter={(value) => [`${value}%`, 'Utilization']}
                              labelFormatter={(label) => `Time: ${label}`}
                              contentStyle={{
                                backgroundColor: '#1F2937',
                                border: '1px solid #374151',
                                borderRadius: '8px',
                                color: '#F9FAFB'
                              }}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="utilization" 
                              stroke="#3B82F6" 
                              strokeWidth={3}
                              dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                              activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* Peak Load Trend Chart - Box Plot */}
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center space-x-2">
                        <ChartBarIcon className="h-5 w-5 text-green-500" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Peak Load Trend (7 days)</h3>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={peakLoadTrendData}>
                            <XAxis 
                              dataKey="dayName" 
                              tick={{ fontSize: 12, fill: '#6B7280' }}
                              axisLine={{ stroke: '#374151' }}
                            />
                            <YAxis 
                              tick={{ fontSize: 12, fill: '#6B7280' }}
                              tickFormatter={(value) => `${value}kg`}
                              axisLine={{ stroke: '#374151' }}
                            />
                            <Tooltip 
                              formatter={(value, name) => [`${value}kg`, name]}
                              labelFormatter={(label) => `Day: ${label}`}
                              contentStyle={{
                                backgroundColor: '#1F2937',
                                border: '1px solid #374151',
                                borderRadius: '8px',
                                color: '#F9FAFB'
                              }}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="minLoad" 
                              stroke="#EF4444"
                              strokeWidth={3}
                              dot={{ fill: '#EF4444', strokeWidth: 2, r: 4 }}
                              activeDot={{ r: 6, stroke: '#EF4444', strokeWidth: 2 }}
                              name="Min Load"
                            />
                            <Line 
                              type="monotone" 
                              dataKey="avgLoad" 
                              stroke="#3B82F6"
                              strokeWidth={3}
                              dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                              activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }}
                              name="Average Load"
                            />
                            <Line 
                              type="monotone" 
                              dataKey="maxLoad" 
                              stroke="#10B981"
                              strokeWidth={3}
                              dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                              activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2 }}
                              name="Max Load"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      {/* Line Chart Legend */}
                      <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-600 dark:text-gray-400">
                        <div className="flex items-center space-x-1">
                          <div className="w-3 h-0.5 bg-red-500 rounded"></div>
                          <span>Min Load</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <div className="w-3 h-0.5 bg-blue-500 rounded"></div>
                          <span>Average Load</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <div className="w-3 h-0.5 bg-green-500 rounded"></div>
                          <span>Max Load</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Historical Data Table */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg">
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Historical Data (Last 7 Days)</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Daily limit switch triggers and utilization data</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">LS1</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">LS2</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">LS3</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">LS4</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Utilization</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {historicalData.map((row, index) => (
                          <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                              {row.date}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                row.ls1 > 0 
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                              }`}>
                                {row.ls1}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                row.ls2 > 0 
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                              }`}>
                                {row.ls2}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                row.ls3 > 0 
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                              }`}>
                                {row.ls3}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                row.ls4 > 0 
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                              }`}>
                                {row.ls4}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900 dark:text-white">
                              <div className="flex items-center justify-center space-x-1">
                                <span className="font-medium">{Math.floor(row.utilization / 60)}h {row.utilization % 60}m</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CraneCardModal;
