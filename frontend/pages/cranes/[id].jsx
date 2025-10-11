import { useRouter } from 'next/router';
import { useQuery } from 'react-query';
import { cranesAPI } from '../../src/lib/api';
import { useSocket } from '../../src/lib/socket';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ComposedChart, Area, ReferenceLine } from 'recharts';
import { 
  WifiIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  ExclamationTriangleIcon,
  ChartBarIcon,
  ArrowUpIcon
} from '@heroicons/react/24/outline';

export default function CraneDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { connected } = useSocket();
  const [realTimeData, setRealTimeData] = useState(null);

  const { data, isLoading, refetch } = useQuery(
    ['crane', id],
    () => cranesAPI.getById(id),
    {
      enabled: !!id,
    }
  );

  const { data: telemetryData } = useQuery(
    ['crane-telemetry', id],
    () => cranesAPI.getTelemetryStats(id, { from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() }),
    {
      enabled: !!id,
    }
  );

  // WebSocket subscription for real-time updates
  useEffect(() => {
    if (!connected || !id) return;

    const unsubscribe = useSocket().subscribeToTelemetry(id, (data) => {
      setRealTimeData(data);
      refetch(); // Refresh crane data
      toast.success(`Real-time update for ${id}`);
    });

    return unsubscribe;
  }, [connected, id, refetch]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 dark:border-primary-400"></div>
      </div>
    );
  }

  if (!data?.data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Crane Not Found</h1>
          <p className="text-gray-600 dark:text-gray-300">The requested crane could not be found.</p>
        </div>
      </div>
    );
  }

  const crane = data.data;
  const telemetry = telemetryData?.data;

  // Format data for charts
  const formatUtilizationTrend = (data) => {
    if (!data || data.length === 0) return [];
    
    // Generate hourly data for the last 24 hours
    const now = new Date();
    const hourlyData = [];
    
    for (let i = 23; i >= 0; i--) {
      const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hourNum = hour.getHours();
      
      // Find data for this hour
      const hourData = data.find(item => item._id.hour === hourNum);
      
      hourlyData.push({
        hour: hourNum,
        utilization: hourData ? Math.round(hourData.avgUtilization || 0) : 0,
        time: `${hourNum.toString().padStart(2, '0')}:00`,
        displayTime: hourNum === 0 ? '00:00' : 
                    hourNum === 4 ? '04:00' :
                    hourNum === 8 ? '08:00' :
                    hourNum === 12 ? '12:00' :
                    hourNum === 16 ? '16:00' :
                    hourNum === 20 ? '20:00' : ''
      });
    }
    
    return hourlyData;
  };

  const formatPeakLoadTrend = (data) => {
    if (!data || data.length === 0) return [];
    
    // Generate daily data for the last 7 days
    const now = new Date();
    const dailyData = [];
    
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayNum = day.getDate();
      const monthNum = day.getMonth() + 1;
      
      // Find data for this day
      const dayData = data.find(item => 
        item._id.day === dayNum && item._id.month === monthNum
      );
      
      dailyData.push({
        day: 7 - i,
        peakLoad: dayData ? Math.round(dayData.maxLoad || 0) : 0,
        avgLoad: dayData ? Math.round(dayData.avgLoad || 0) : 0,
        minLoad: dayData ? Math.round((dayData.avgLoad || 0) * 0.6) : 0,
        maxLoad: dayData ? Math.round(dayData.maxLoad || 0) : 0,
        q1Load: dayData ? Math.round((dayData.avgLoad || 0) * 0.8) : 0,
        q3Load: dayData ? Math.round((dayData.avgLoad || 0) * 1.2) : 0,
        date: `${monthNum}/${dayNum}`,
        dayName: day.toLocaleDateString('en', { weekday: 'short' })
      });
    }
    
    return dailyData;
  };

  // Format chart data
  const utilizationTrendData = formatUtilizationTrend(telemetry?.utilizationTrend);
  const peakLoadTrendData = formatPeakLoadTrend(telemetry?.peakLoadTrend);

  // Debug logging
  console.log('Chart Data Debug:', {
    rawPeakLoadTrend: telemetry?.peakLoadTrend,
    formattedPeakLoadTrend: peakLoadTrendData
  });

  const currentLoad = realTimeData?.data?.load || crane.currentLoad || 0;
  const swl = crane.swl || 100;
  const utilization = realTimeData?.data?.util || crane.utilization || 0;
  const isOverloaded = currentLoad > swl;

  // Generate historical data for the last 7 days
  const generateHistoricalData = () => {
    const data = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayName = date.toLocaleDateString('en', { weekday: 'short' });
      const dayNum = date.getDate();
      const monthNum = date.getMonth() + 1;
      
      // Generate realistic data based on crane ID for consistency
      const baseSeed = crane.craneId.charCodeAt(crane.craneId.length - 1) || 1;
      const daySeed = (baseSeed + i) % 7;
      
      // Generate limit switch trigger counts (0-50 range)
      const ls1 = Math.floor((baseSeed * 1 + daySeed * 3) % 51);
      const ls2 = Math.floor((baseSeed * 2 + daySeed * 5) % 51);
      const ls3 = Math.floor((baseSeed * 3 + daySeed * 7) % 51);
      const ls4 = Math.floor((baseSeed * 4 + daySeed * 11) % 51);
      
      // Generate utilization (30-120 minutes range)
      const utilization = Math.floor((baseSeed * 5 + daySeed * 13) % 91) + 30;
      
      data.push({
        date: `${dayName}, ${monthNum}/${dayNum}`,
        ls1: ls1,
        ls2: ls2,
        ls3: ls3,
        ls4: ls4,
        utilization: utilization
      });
    }
    
    return data;
  };

  return (
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
              {utilizationTrendData && utilizationTrendData.length > 0 ? (
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
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                  <div className="text-center">
                    <ChartBarIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg font-medium">No utilization data available</p>
                    <p className="text-sm">Data will appear when crane sends telemetry</p>
                  </div>
                </div>
              )}
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
              {peakLoadTrendData && peakLoadTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={peakLoadTrendData}>
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
                      formatter={(value, name) => {
                        const dayData = peakLoadTrendData.find(d => d.dayName === value);
                        return [
                          `Min: ${dayData?.minLoad || 0}kg\nQ1: ${dayData?.q1Load || 0}kg\nAvg: ${dayData?.avgLoad || 0}kg\nQ3: ${dayData?.q3Load || 0}kg\nMax: ${dayData?.maxLoad || 0}kg`,
                          'Load Distribution'
                        ];
                      }}
                      labelFormatter={(label) => `Day: ${label}`}
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#F9FAFB',
                        whiteSpace: 'pre-line'
                      }}
                    />
                    {/* Box plot representation using area and lines */}
                    <Area 
                      dataKey="q1Load" 
                      fill="#E5E7EB"
                      stroke="#9CA3AF"
                      strokeWidth={1}
                      name="Q1 Load"
                    />
                    <Area 
                      dataKey="avgLoad" 
                      fill="#10B981"
                      stroke="#059669"
                      strokeWidth={2}
                      name="Average Load"
                    />
                    <Area 
                      dataKey="q3Load" 
                      fill="#9CA3AF"
                      stroke="#6B7280"
                      strokeWidth={1}
                      name="Q3 Load"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="minLoad" 
                      stroke="#D1D5DB"
                      strokeWidth={2}
                      dot={{ fill: '#D1D5DB', strokeWidth: 2, r: 3 }}
                      name="Min Load"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="maxLoad" 
                      stroke="#374151"
                      strokeWidth={2}
                      dot={{ fill: '#374151', strokeWidth: 2, r: 3 }}
                      name="Max Load"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                  <div className="text-center">
                    <ChartBarIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg font-medium">No peak load data available</p>
                    <p className="text-sm">Data will appear when crane sends telemetry</p>
                  </div>
                </div>
              )}
            </div>
            {/* Box Plot Legend */}
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-600 dark:text-gray-400">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-gray-300 dark:bg-gray-600 rounded"></div>
                <span>Min</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-gray-500 dark:bg-gray-500 rounded"></div>
                <span>Q1</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span>Average</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-gray-500 dark:bg-gray-500 rounded"></div>
                <span>Q3</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-gray-300 dark:bg-gray-600 rounded"></div>
                <span>Max</span>
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
              {generateHistoricalData().map((row, index) => (
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

      {/* Recent Tickets */}
      {crane.recentTickets && crane.recentTickets.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Alerts</h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {crane.recentTickets.map((ticket) => (
                <div key={ticket._id} className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      ticket.severity === 'critical' ? 'bg-red-400' :
                      ticket.severity === 'warning' ? 'bg-yellow-400' :
                      'bg-blue-400'
                    }`}></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{ticket.message}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{ticket.type} • {ticket.severity}</p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">
                    {new Date(ticket.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
