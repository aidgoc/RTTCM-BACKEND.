import { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { useRouter } from 'next/router';
import { useSocket } from '../src/lib/socket';
import { useMQTTStatus } from '../src/hooks/useMQTTStatus';
import { cranesAPI } from '../src/lib/api';
import { useAuth } from '../src/lib/auth';
import toast from 'react-hot-toast';

export default function Analytics() {
  const { user, loading } = useAuth();
  const { connected: wsConnected } = useSocket();
  const { connected: mqttConnected } = useMQTTStatus();
  const router = useRouter();
  const [selectedCrane, setSelectedCrane] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Show loading state while user data is being fetched
  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-4 border-cyan-500/30 border-t-cyan-400"></div>
      </div>
    );
  }

  // Redirect non-admin/manager users
  if (user.role !== 'admin' && user.role !== 'manager') {
    router.push('/');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-4 border-cyan-500/30 border-t-cyan-400"></div>
      </div>
    );
  }

  // Fetch cranes data
  const { data: cranesData, isLoading: cranesLoading } = useQuery(
    'cranes',
    () => cranesAPI.getAll({ limit: 50 }),
    {
      onSuccess: (data) => {
        const allCranes = data.data.cranes || [];
        
        // Filter cranes based on user role
        const filteredCranes = allCranes.filter(crane => {
          if (user?.role === 'admin') {
            return true;
          } else if (user?.role === 'manager') {
            return user?.assignedCranes && user?.assignedCranes.includes(crane.craneId);
          }
          return false;
        });
        
        // Set first crane as default if none selected
        if (filteredCranes.length > 0 && !selectedCrane) {
          // Check if there's a selected crane from sessionStorage (from dashboard click)
          const selectedCraneId = sessionStorage.getItem('selectedCraneId');
          if (selectedCraneId) {
            const crane = filteredCranes.find(c => c.craneId === selectedCraneId);
            if (crane) {
              setSelectedCrane(crane);
              sessionStorage.removeItem('selectedCraneId'); // Clear after use
            } else {
              setSelectedCrane(filteredCranes[0]);
            }
          } else {
            setSelectedCrane(filteredCranes[0]);
          }
        }
      },
      refetchInterval: 10000,
      refetchIntervalInBackground: true,
    }
  );

  // Fetch analytics data when crane is selected
  useEffect(() => {
    if (selectedCrane) {
      fetchAnalyticsData(selectedCrane);
    }
  }, [selectedCrane]);

  const fetchAnalyticsData = async (crane) => {
    setLoadingAnalytics(true);
    try {
      // Try to fetch real data from API
      const response = await fetch(`/api/cranes/${crane.craneId}/analytics`);
      const data = await response.json();
      
      if (data && data.utilization24h && data.peakLoad7d && data.weeklyLimitSwitches && data.hourlyUtilization) {
        console.log('API returned valid data');
        setAnalyticsData(data);
      } else {
        throw new Error('Invalid API response');
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      // Show empty state when no data is available
      console.log('No analytics data available, showing empty state');
      const analyticsData = {
        currentLoad: 0,
        maxLoad: selectedCrane?.swl || 0,
        currentUtilization: 0,
        connectionStatus: 'No Data',
        lastSeen: null,
        utilization24h: [],
        peakLoad7d: [],
        weeklyLimitSwitches: [],
        hourlyUtilization: []
      };
      
      console.log('Analytics data structure:', analyticsData);
      setAnalyticsData(analyticsData);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const cranes = cranesData?.data?.cranes?.filter(crane => {
    if (user?.role === 'admin') {
      return true;
    } else if (user?.role === 'manager') {
      return user?.assignedCranes && user?.assignedCranes.includes(crane.craneId);
    }
    return false;
  }) || [];

  if (cranesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 dark:border-primary-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative z-10 bg-white dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/')}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {cranes.length} crane{cranes.length !== 1 ? 's' : ''} • {user?.role?.toUpperCase()}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Connection status */}
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
                mqttConnected 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              }`}>
                <div className={`w-2 h-2 rounded-full ${mqttConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span>{mqttConnected ? 'MQTT Connected' : 'MQTT Disconnected'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Crane Selection */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Crane
          </label>
          <select
            value={selectedCrane?.craneId || ''}
            onChange={(e) => {
              const crane = cranes.find(c => c.craneId === e.target.value);
              setSelectedCrane(crane);
            }}
            className="block w-full max-w-xs px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">Choose a crane...</option>
            {cranes.map((crane) => (
              <option key={crane.craneId} value={crane.craneId}>
                {crane.name} - {crane.craneId}
              </option>
            ))}
          </select>
        </div>

        {selectedCrane && (
          <div className="space-y-8">
            {/* Crane Header */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0 p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <img 
                      src="https://cdn-icons-png.flaticon.com/128/10549/10549312.png" 
                      alt="Tower Crane" 
                      className="h-8 w-8"
                    />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedCrane.name}</h2>
                    <p className="text-lg text-gray-600 dark:text-gray-300">
                      {selectedCrane.craneId} • {selectedCrane.location}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      selectedCrane.online 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      <div className={`w-2 h-2 rounded-full mr-2 ${selectedCrane.online ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      {selectedCrane.online ? 'Online' : 'Offline'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Analytics Content */}
            {loadingAnalytics ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className="ml-2 text-gray-600">Loading analytics...</span>
              </div>
            ) : analyticsData ? (
              <div className="space-y-8">
                {/* Current Status Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {/* Connection Status */}
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Connection Status</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{analyticsData.connectionStatus}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Last seen {new Date(analyticsData.lastSeen).toLocaleTimeString()}</p>
                      </div>
                      <div className={`w-3 h-3 rounded-full ${analyticsData.connectionStatus === 'Online' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    </div>
                  </div>

                  {/* Current Load */}
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Current Load</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{analyticsData.currentLoad}t</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">/ {analyticsData.maxLoad}t</p>
                      </div>
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    </div>
                  </div>

                  {/* Current Utilization */}
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Utilization (Current)</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{analyticsData.currentUtilization}%</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Last 24 hours</p>
                      </div>
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    </div>
                  </div>

                  {/* Limit Switches */}
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Limit Switches</p>
                        <div className="flex space-x-2 mt-2">
                          {['ls1', 'ls2', 'ls3', 'ls4'].map((ls, index) => (
                            <div key={ls} className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                              <span className="text-xs font-bold text-white">{ls.toUpperCase().slice(-1)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    </div>
                  </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* 24h Utilization Trend Graph */}
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-lg">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-6 flex items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                      Utilization Trend (24h)
                    </h3>
                    <div className="h-80 bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-700 dark:to-blue-900 rounded-xl p-6 relative overflow-hidden">
                      {/* Background pattern */}
                      <div className="absolute inset-0 opacity-5">
                        <div className="absolute inset-0" style={{
                          backgroundImage: `radial-gradient(circle at 1px 1px, #3B82F6 1px, transparent 0)`,
                          backgroundSize: '20px 20px'
                        }}></div>
                      </div>
                      
                      <div className="w-full h-full relative z-10">
                        {/* Y-axis labels */}
                        <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-sm font-medium text-gray-600 dark:text-gray-300">
                          <span className="bg-white dark:bg-gray-800 px-2 py-1 rounded-full shadow-sm animate-fade-in-up" style={{ animationDelay: '0.1s' }}>100%</span>
                          <span className="bg-white dark:bg-gray-800 px-2 py-1 rounded-full shadow-sm animate-fade-in-up" style={{ animationDelay: '0.2s' }}>75%</span>
                          <span className="bg-white dark:bg-gray-800 px-2 py-1 rounded-full shadow-sm animate-fade-in-up" style={{ animationDelay: '0.3s' }}>50%</span>
                          <span className="bg-white dark:bg-gray-800 px-2 py-1 rounded-full shadow-sm animate-fade-in-up" style={{ animationDelay: '0.4s' }}>25%</span>
                          <span className="bg-white dark:bg-gray-800 px-2 py-1 rounded-full shadow-sm animate-fade-in-up" style={{ animationDelay: '0.5s' }}>0%</span>
                        </div>
                        
                        {/* Chart area */}
                        <div className="ml-12 h-full relative">
                          {/* Grid lines */}
                          <div className="absolute inset-0">
                            {[0, 25, 50, 75, 100].map((value, index) => (
                              <div 
                                key={index}
                                className="absolute w-full border-t border-gray-300 dark:border-gray-600 opacity-30 animate-fade-in"
                                style={{ 
                                  top: `${100 - value}%`,
                                  animationDelay: `${0.6 + index * 0.1}s`
                                }}
                              ></div>
                            ))}
                          </div>
                          
                          {/* Area under the curve */}
                          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <defs>
                              <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3"/>
                                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.05"/>
                              </linearGradient>
                              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.8"/>
                                <stop offset="50%" stopColor="#3B82F6" stopOpacity="1"/>
                                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.8"/>
                              </linearGradient>
                            </defs>
                            {/* Area under the curve */}
                            <polygon
                              fill="url(#areaGradient)"
                              className="animate-fade-in"
                              style={{ animationDelay: '0.8s' }}
                              points={`0,100 ${analyticsData?.utilization24h?.map((point, index) => {
                                const x = (index / (analyticsData.utilization24h.length - 1)) * 100;
                                const y = 100 - point.value;
                                return `${x},${y}`;
                              }).join(' ')} 100,100`}
                            />
                            {/* Line graph */}
                            <polyline
                              fill="none"
                              stroke="url(#lineGradient)"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="animate-draw-line"
                              style={{ animationDelay: '1s', animationDuration: '2s' }}
                              points={analyticsData?.utilization24h?.map((point, index) => {
                                const x = (index / (analyticsData.utilization24h.length - 1)) * 100;
                                const y = 100 - point.value;
                                return `${x},${y}`;
                              }).join(' ')}
                            />
                            {/* Data points */}
                            {analyticsData?.utilization24h?.map((point, index) => {
                              const x = (index / (analyticsData.utilization24h.length - 1)) * 100;
                              const y = 100 - point.value;
                              return (
                                <g key={index}>
                                  <circle
                                    cx={x}
                                    cy={y}
                                    r="5"
                                    fill="white"
                                    stroke="#3B82F6"
                                    strokeWidth="3"
                                    className="animate-scale-in hover:r-6 transition-all duration-300 cursor-pointer"
                                    style={{ 
                                      animationDelay: `${1.5 + index * 0.1}s`,
                                      filter: 'drop-shadow(0 2px 4px rgba(59, 130, 246, 0.3))'
                                    }}
                                    title={`${point.time}: ${point.value}%`}
                                  />
                                  <circle
                                    cx={x}
                                    cy={y}
                                    r="2.5"
                                    fill="#3B82F6"
                                    className="animate-scale-in"
                                    style={{ animationDelay: `${1.5 + index * 0.1}s` }}
                                  />
                                </g>
                              );
                            })}
                          </svg>
                          
                          {/* X-axis labels */}
                          <div className="absolute -bottom-8 w-full flex justify-between text-sm font-medium text-gray-600 dark:text-gray-300">
                            {analyticsData?.utilization24h?.map((point, index) => (
                              <span 
                                key={index}
                                className="transform -rotate-45 origin-left bg-white dark:bg-gray-800 px-2 py-1 rounded-full shadow-sm animate-fade-in-up"
                                style={{ 
                                  left: `${(index / (analyticsData.utilization24h.length - 1)) * 100}%`,
                                  position: 'absolute',
                                  animationDelay: `${2 + index * 0.1}s`
                                }}
                              >
                                {point.time}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 text-center">
                      <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-full shadow-lg animate-fade-in-up" style={{ animationDelay: '2.5s' }}>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="font-semibold">
                          Peak: {Math.max(...(analyticsData?.utilization24h?.map(p => p.value) || [0]))}% at {analyticsData?.utilization24h?.find(p => p.value === Math.max(...(analyticsData?.utilization24h?.map(p => p.value) || [0])))?.time || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 7-day Peak Load Trend Graph */}
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-lg">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-6 flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                      Peak Load Trend (7 days)
                    </h3>
                    <div className="h-80 bg-gradient-to-br from-gray-50 to-green-50 dark:from-gray-700 dark:to-green-900 rounded-xl p-6 relative overflow-hidden">
                      {/* Background pattern */}
                      <div className="absolute inset-0 opacity-5">
                        <div className="absolute inset-0" style={{
                          backgroundImage: `radial-gradient(circle at 1px 1px, #10B981 1px, transparent 0)`,
                          backgroundSize: '20px 20px'
                        }}></div>
                      </div>
                      
                      <div className="w-full h-full flex items-end justify-between space-x-3 relative z-10">
                        {analyticsData?.peakLoad7d?.map((day, index) => (
                          <div key={index} className="flex flex-col items-center flex-1 group">
                            <div className="relative w-full h-64 flex flex-col justify-end">
                              {/* Max line */}
                              <div 
                                className="w-full bg-gradient-to-t from-gray-600 to-gray-400 rounded-t-lg min-h-[3px] animate-grow-up shadow-lg group-hover:shadow-xl transition-all duration-300"
                                style={{ 
                                  height: `${Math.max((day.max / 1500) * 240, 3)}px`,
                                  animationDelay: `${1 + index * 0.2}s`,
                                  animationDuration: '1.5s'
                                }}
                                title={`${day.day} Max: ${day.max}kg`}
                              ></div>
                              {/* Q3 area */}
                              <div 
                                className="absolute top-0 w-full bg-gradient-to-t from-green-700 to-green-600 rounded-t-lg animate-grow-up shadow-md group-hover:shadow-lg transition-all duration-300"
                                style={{ 
                                  height: `${Math.max((day.q3 / 1500) * 240, 3)}px`,
                                  animationDelay: `${1.1 + index * 0.2}s`,
                                  animationDuration: '1.5s'
                                }}
                                title={`${day.day} Q3: ${day.q3}kg`}
                              ></div>
                              {/* Average line */}
                              <div 
                                className="absolute top-0 w-full bg-gradient-to-t from-green-600 to-green-500 rounded-t-lg animate-grow-up shadow-md group-hover:shadow-lg transition-all duration-300"
                                style={{ 
                                  height: `${Math.max((day.avg / 1500) * 240, 3)}px`,
                                  animationDelay: `${1.2 + index * 0.2}s`,
                                  animationDuration: '1.5s'
                                }}
                                title={`${day.day} Average: ${day.avg}kg`}
                              ></div>
                              {/* Q1 area */}
                              <div 
                                className="absolute top-0 w-full bg-gradient-to-t from-green-500 to-green-400 rounded-t-lg animate-grow-up shadow-md group-hover:shadow-lg transition-all duration-300"
                                style={{ 
                                  height: `${Math.max((day.q1 / 1500) * 240, 3)}px`,
                                  animationDelay: `${1.3 + index * 0.2}s`,
                                  animationDuration: '1.5s'
                                }}
                                title={`${day.day} Q1: ${day.q1}kg`}
                              ></div>
                              
                              {/* Hover tooltip */}
                              <div className="absolute -top-20 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-20">
                                <div className="text-center">
                                  <div className="font-semibold">{day.day}</div>
                                  <div>Max: {day.max}kg</div>
                                  <div>Avg: {day.avg}kg</div>
                                </div>
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                              </div>
                            </div>
                            <span 
                              className="text-sm font-medium text-gray-600 dark:text-gray-300 mt-3 transform -rotate-45 origin-left bg-white dark:bg-gray-800 px-2 py-1 rounded-full shadow-sm animate-fade-in-up group-hover:bg-green-100 dark:group-hover:bg-green-900 group-hover:text-green-700 dark:group-hover:text-green-300 transition-all duration-300"
                              style={{ animationDelay: `${2 + index * 0.1}s` }}
                            >
                              {day.day.slice(0, 3)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="mt-6 flex justify-center space-x-6 text-sm">
                      <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-full shadow-md animate-fade-in-up" style={{ animationDelay: '2.5s' }}>
                        <div className="w-4 h-4 bg-gradient-to-t from-gray-600 to-gray-400 rounded animate-scale-in" style={{ animationDelay: '2.6s' }}></div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">Max</span>
                      </div>
                      <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-full shadow-md animate-fade-in-up" style={{ animationDelay: '2.7s' }}>
                        <div className="w-4 h-4 bg-gradient-to-t from-green-700 to-green-600 rounded animate-scale-in" style={{ animationDelay: '2.8s' }}></div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">Q3</span>
                      </div>
                      <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-full shadow-md animate-fade-in-up" style={{ animationDelay: '2.9s' }}>
                        <div className="w-4 h-4 bg-gradient-to-t from-green-600 to-green-500 rounded animate-scale-in" style={{ animationDelay: '3s' }}></div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">Average</span>
                      </div>
                      <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-full shadow-md animate-fade-in-up" style={{ animationDelay: '3.1s' }}>
                        <div className="w-4 h-4 bg-gradient-to-t from-green-500 to-green-400 rounded animate-scale-in" style={{ animationDelay: '3.2s' }}></div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">Q1</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Historical Data Table */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Historical Data (Last 7 Days)</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Daily limit switch triggers and utilization data</p>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">LS1</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">LS2</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">LS3</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">LS4</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Utilization</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {analyticsData?.weeklyLimitSwitches?.map((day, index) => (
                          <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                              {day.day}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                              {day.ls1}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                              {day.ls2}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                              {day.ls3}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                              {day.ls4}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                              {day.utilization}h {Math.round((day.utilization % 1) * 60)}m
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-500 dark:text-gray-400">
                  <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <p>No analytics data available</p>
                </div>
              </div>
            )}

            {/* DRM3300 Specific Analytics */}
            {analyticsData && (
              <div className="mt-8 space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                  DRM3300 Safety Analytics
                </h2>

                {/* Operating Mode Distribution */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-lg">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                    Operating Mode Distribution
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-green-800 dark:text-green-200">Normal Mode</p>
                          <p className="text-2xl font-bold text-green-900 dark:text-green-100">85%</p>
                        </div>
                        <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold">N</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Test Mode</p>
                          <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">12%</p>
                        </div>
                        <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold">T</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Calibration</p>
                          <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">3%</p>
                        </div>
                        <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold">C</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Position Analytics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Trolley Position Range */}
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-lg">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                      Trolley Position Range
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Current Position</span>
                        <span className="font-medium text-gray-900 dark:text-white">15.5m</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: '62%' }}></div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>0m</span>
                        <span>25m</span>
                        <span>50m</span>
                      </div>
                    </div>
                  </div>

                  {/* Hook Height Range */}
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-lg">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                      Hook Height Range
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Current Height</span>
                        <span className="font-medium text-gray-900 dark:text-white">25.0m</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: '50%' }}></div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>0m</span>
                        <span>25m</span>
                        <span>50m</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Wind Conditions */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-lg">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                    Wind Conditions Analysis
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Current Wind Speed</span>
                        <span className="font-medium text-gray-900 dark:text-white">12.5 km/h</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '25%' }}></div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <span>0 km/h</span>
                        <span>25 km/h</span>
                        <span>50 km/h</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Wind Direction</span>
                        <span className="font-medium text-gray-900 dark:text-white">180° (S)</span>
                      </div>
                      <div className="w-16 h-16 mx-auto relative">
                        <div className="w-full h-full border-2 border-gray-300 dark:border-gray-600 rounded-full flex items-center justify-center">
                          <div className="w-1 h-8 bg-red-500 transform rotate-180 origin-bottom"></div>
                        </div>
                        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 dark:text-gray-400">N</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Safety Alerts Summary */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-lg">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                    Safety Alerts Summary (24h)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-red-600 dark:text-red-400">2</div>
                      <div className="text-sm text-red-800 dark:text-red-200">Overload Alerts</div>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">5</div>
                      <div className="text-sm text-yellow-800 dark:text-yellow-200">Limit Switch Triggers</div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">1</div>
                      <div className="text-sm text-blue-800 dark:text-blue-200">Wind Warnings</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">12</div>
                      <div className="text-sm text-green-800 dark:text-green-200">Tests Completed</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
  );
}
