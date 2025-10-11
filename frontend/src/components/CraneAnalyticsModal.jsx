import React, { useState, useEffect } from 'react';

const CraneAnalyticsModal = ({ crane, isOpen, onClose }) => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && crane) {
      fetchAnalyticsData();
    }
  }, [isOpen, crane]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      // Fetch real data from API
      const response = await fetch(`/api/cranes/${crane.craneId}/analytics`);
      const data = await response.json();
      
      // Check if data is valid and has the required arrays
      if (data && data.utilization24h && data.peakLoad7d && data.weeklyLimitSwitches && data.hourlyUtilization) {
        console.log('API returned valid data');
        setAnalyticsData(data);
      } else {
        console.log('API returned invalid data, using fallback');
        throw new Error('Invalid API response');
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      // Show empty state when no data is available
      console.log('No analytics data available, showing empty state');
      const analyticsData = {
        currentLoad: 0,
        maxLoad: crane?.swl || 0,
        currentUtilization: 0,
        connectionStatus: 'No Data',
        lastSeen: null,
        utilization24h: [],
        peakLoad7d: [],
        weeklyLimitSwitches: [],
        hourlyUtilization: []
      };
      
      console.log('Analytics data structure:', analyticsData);
      console.log('Utilization24h length:', analyticsData.utilization24h.length);
      console.log('PeakLoad7d length:', analyticsData.peakLoad7d.length);
      console.log('WeeklyLimitSwitches length:', analyticsData.weeklyLimitSwitches.length);
      console.log('HourlyUtilization length:', analyticsData.hourlyUtilization.length);
      
      setAnalyticsData(analyticsData);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !crane) {
    console.log('Analytics modal not rendering - isOpen:', isOpen, 'crane:', crane?.craneId);
    return null;
  }
  
  console.log('Analytics modal rendering for crane:', crane.craneId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800">Analytics - {crane.name}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-2 text-gray-600">Loading analytics...</span>
            </div>
          ) : analyticsData ? (
            <div className="space-y-6">
              {/* Debug Info - Remove this in production */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm">
                <strong>Debug Info:</strong> Data loaded - Utilization24h: {analyticsData?.utilization24h?.length || 0} points, 
                PeakLoad7d: {analyticsData?.peakLoad7d?.length || 0} days, 
                WeeklyLS: {analyticsData?.weeklyLimitSwitches?.length || 0} days,
                HourlyUtil: {analyticsData?.hourlyUtilization?.length || 0} hours
              </div>
              {/* Current Status Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Connection Status */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Connection Status</p>
                      <p className="text-lg font-semibold text-green-600">{analyticsData?.connectionStatus || 'Online'}</p>
                      <p className="text-xs text-gray-500">Last seen {analyticsData?.lastSeen ? new Date(analyticsData.lastSeen).toLocaleTimeString() : 'N/A'}</p>
                    </div>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                </div>

                {/* Current Load */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div>
                    <p className="text-sm text-gray-600">Current Load</p>
                    <p className="text-lg font-semibold text-gray-800">{analyticsData?.currentLoad || 0}t / {analyticsData?.maxLoad || 2500}t</p>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${((analyticsData?.currentLoad || 0) / (analyticsData?.maxLoad || 2500)) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Current Utilization */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div>
                    <p className="text-sm text-gray-600">Utilization (Current)</p>
                    <p className="text-lg font-semibold text-gray-800">{analyticsData?.currentUtilization || 0}% ↑</p>
                    <p className="text-xs text-gray-500">Last 24 hours</p>
                  </div>
                </div>

                {/* Limit Switches Status */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Limit Switches</p>
                    <div className="grid grid-cols-2 gap-2">
                      {['LS1', 'LS2', 'LS3', 'LS4'].map((ls, index) => (
                        <div key={ls} className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-xs text-gray-600">{ls}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 24h Utilization Trend Graph */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Utilization Trend (24h)</h3>
                <div className="h-64 bg-gray-50 rounded-lg p-4">
                  <div className="w-full h-full relative">
                    {/* Y-axis labels */}
                    <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500">
                      <span>100%</span>
                      <span>75%</span>
                      <span>50%</span>
                      <span>25%</span>
                      <span>0%</span>
                    </div>
                    
                    {/* Chart area */}
                    <div className="ml-8 h-full relative">
                      {/* Grid lines */}
                      <div className="absolute inset-0">
                        {[0, 25, 50, 75, 100].map((value, index) => (
                          <div 
                            key={index}
                            className="absolute w-full border-t border-gray-200"
                            style={{ top: `${100 - value}%` }}
                          ></div>
                        ))}
                      </div>
                      
                      {/* Line graph */}
                      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <polyline
                          fill="none"
                          stroke="#3B82F6"
                          strokeWidth="2"
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
                            <circle
                              key={index}
                              cx={x}
                              cy={y}
                              r="2"
                              fill="#3B82F6"
                              title={`${point.time}: ${point.value}%`}
                            />
                          );
                        })}
                      </svg>
                      
                      {/* X-axis labels */}
                      <div className="absolute -bottom-6 w-full flex justify-between text-xs text-gray-500">
                        {analyticsData?.utilization24h?.map((point, index) => (
                          <span 
                            key={index}
                            className="transform -rotate-45 origin-left"
                            style={{ 
                              left: `${(index / (analyticsData.utilization24h.length - 1)) * 100}%`,
                              position: 'absolute'
                            }}
                          >
                            {point.time}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-center text-sm text-gray-600">
                  Peak: {Math.max(...(analyticsData?.utilization24h?.map(p => p.value) || [0]))}% at {analyticsData?.utilization24h?.find(p => p.value === Math.max(...(analyticsData?.utilization24h?.map(p => p.value) || [0])))?.time || 'N/A'}
                </div>
              </div>

              {/* 7-day Peak Load Trend Graph */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Peak Load Trend (7 days)</h3>
                <div className="h-64 bg-gray-50 rounded-lg p-4">
                  <div className="w-full h-full flex items-end justify-between space-x-2">
                    {analyticsData?.peakLoad7d?.map((day, index) => (
                      <div key={index} className="flex flex-col items-center flex-1">
                        <div className="relative w-full">
                          {/* Max line */}
                          <div 
                            className="w-full bg-gray-400 rounded-t min-h-[2px]"
                            style={{ height: `${Math.max((day.max / 1500) * 200, 2)}px` }}
                            title={`${day.day} Max: ${day.max}kg`}
                          ></div>
                          {/* Q3 area */}
                          <div 
                            className="absolute top-0 w-full bg-green-600 rounded-t"
                            style={{ height: `${Math.max((day.q3 / 1500) * 200, 2)}px` }}
                            title={`${day.day} Q3: ${day.q3}kg`}
                          ></div>
                          {/* Average line */}
                          <div 
                            className="absolute top-0 w-full bg-green-500 rounded-t"
                            style={{ height: `${Math.max((day.avg / 1500) * 200, 2)}px` }}
                            title={`${day.day} Average: ${day.avg}kg`}
                          ></div>
                          {/* Q1 area */}
                          <div 
                            className="absolute top-0 w-full bg-green-400 rounded-t"
                            style={{ height: `${Math.max((day.q1 / 1500) * 200, 2)}px` }}
                            title={`${day.day} Q1: ${day.q1}kg`}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-600 mt-2 transform -rotate-45 origin-left">{day.day.slice(0, 3)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-4 flex justify-center space-x-4 text-xs text-gray-600">
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-gray-400 rounded"></div>
                    <span>Max</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-green-600 rounded"></div>
                    <span>Q3</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span>Average</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-green-400 rounded"></div>
                    <span>Q1</span>
                  </div>
                </div>
              </div>

              {/* Weekly Limit Switch Counts Table */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Weekly Limit Switch Counts</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 font-semibold text-gray-700">Day</th>
                        <th className="text-center py-2 px-3 font-semibold text-gray-700">LS1</th>
                        <th className="text-center py-2 px-3 font-semibold text-gray-700">LS2</th>
                        <th className="text-center py-2 px-3 font-semibold text-gray-700">LS3</th>
                        <th className="text-center py-2 px-3 font-semibold text-gray-700">LS4</th>
                        <th className="text-center py-2 px-3 font-semibold text-gray-700">Utilization %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsData?.weeklyLimitSwitches?.map((row, index) => (
                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-3 font-medium text-gray-800">{row.day}</td>
                          <td className="py-2 px-3 text-center text-blue-600 font-semibold">{row.ls1}</td>
                          <td className="py-2 px-3 text-center text-blue-600 font-semibold">{row.ls2}</td>
                          <td className="py-2 px-3 text-center text-blue-600 font-semibold">{row.ls3}</td>
                          <td className="py-2 px-3 text-center text-blue-600 font-semibold">{row.ls4}</td>
                          <td className="py-2 px-3 text-center text-green-600 font-semibold">{row.utilization}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Hourly Utilization Table */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Hourly Utilization Data</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 font-semibold text-gray-700">Time</th>
                        <th className="text-center py-2 px-3 font-semibold text-gray-700">Utilization %</th>
                        <th className="text-center py-2 px-3 font-semibold text-gray-700">Load (kg)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsData?.hourlyUtilization?.map((row, index) => (
                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-3 font-medium text-gray-800">{row.time}</td>
                          <td className="py-2 px-3 text-center text-green-600 font-semibold">{row.utilization}%</td>
                          <td className="py-2 px-3 text-center text-blue-600 font-semibold">{row.load.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No analytics data available</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CraneAnalyticsModal;
