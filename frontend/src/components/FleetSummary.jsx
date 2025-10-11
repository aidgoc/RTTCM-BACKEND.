import { 
  CogIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  ChartBarIcon,
  SignalIcon
} from '@heroicons/react/24/outline';

export default function FleetSummary({ data }) {
  const cards = [
    {
      name: 'Total Cranes',
      value: data.totalCranes,
      icon: 'tower-crane',
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900',
    },
    {
      name: 'Online',
      value: data.onlineCranes,
      icon: 'wifi',
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900',
    },
    {
      name: 'Active Alerts',
      value: data.activeAlerts,
      icon: ExclamationTriangleIcon,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-100 dark:bg-red-900',
    },
    {
      name: 'Avg Utilization',
      value: `${data.avgUtilization}%`,
      icon: ChartBarIcon,
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div 
          key={card.name} 
          className="bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-600 rounded-xl shadow-lg hover:shadow-2xl hover:scale-[1.02] hover:border-blue-500 dark:hover:border-blue-400 transition-all duration-300 cursor-pointer group relative overflow-hidden"
        >
          <div className="p-6">
            <div className="flex items-center">
              <div className={`flex-shrink-0 p-4 rounded-lg ${card.bgColor} group-hover:scale-110 group-hover:shadow-lg transition-all duration-300`}>
                {card.icon === 'tower-crane' ? (
                  <img 
                    src="https://cdn-icons-png.flaticon.com/128/16400/16400238.png" 
                    alt="Tower Crane" 
                    className={`h-7 w-7 ${card.color} group-hover:animate-pulse`}
                  />
                ) : card.icon === 'wifi' ? (
                  <SignalIcon className={`h-7 w-7 ${card.color} animate-pulse`} />
                ) : (
                  <card.icon className={`h-7 w-7 ${card.color} group-hover:animate-pulse`} />
                )}
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-semibold text-gray-600 dark:text-gray-300 truncate group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors duration-300">
                    {card.name}
                  </dt>
                  <dd className="text-2xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                    {card.value}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
