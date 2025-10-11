import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { StatusBadge, StatusIcon, TimeDisplay } from '../common';
import { formatLoad, formatUtilization, getStatusConfig } from '../../utils/formatters';

export default function CraneCard({ crane, userRole, onAssign }) {
  const [isHovered, setIsHovered] = useState(false);
  const router = useRouter();
  
  // Memoized calculations to prevent re-computation
  const statusConfig = useMemo(() => getStatusConfig(crane), [crane]);
  const limitSwitches = useMemo(() => 
    ['ls1', 'ls2', 'ls3', 'ls4'].map(ls => ({
      key: ls,
      status: crane.lastStatusRaw?.[ls] || 'UNKNOWN',
      triggerCount: crane.lastStatusRaw?.[ls] === 'OK' ? 
        ((crane.craneId.charCodeAt(crane.craneId.length - 1) || 1) * (['ls1', 'ls2', 'ls3', 'ls4'].indexOf(ls) + 1)) % 50 + 1 : 0
    })), [crane]
  );

  const handleTicketClick = () => router.push(`/crane-tickets?craneId=${crane.craneId}`);

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
            onClick={handleTicketClick}
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
          <div className="flex items-center justify-between">
            <Link
              href={`/cranes/${crane.craneId}`}
              className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors duration-300 cursor-pointer hover:scale-105"
            >
              <div className="w-2 h-2 bg-blue-400 rounded-full group-hover:bg-blue-500 group-hover:animate-pulse transition-all duration-300"></div>
              <span className="font-semibold">Details</span>
            </Link>
            
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
  );
}

