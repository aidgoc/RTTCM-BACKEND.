// Utility functions for data formatting and calculations

export const formatLoad = (currentLoad, swl) => {
  const loadTons = ((currentLoad || 0) / 1000).toFixed(1);
  const swlTons = (swl / 1000).toFixed(1);
  return `${loadTons}T - ${swlTons}T`;
};

export const formatUtilization = (utilization) => {
  const hours = Math.floor((utilization || 0) / 60);
  const minutes = Math.floor((utilization || 0) % 60);
  return `${hours}h ${minutes}m`;
};

export const formatLastSeen = (lastSeen) => {
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

export const getStatusConfig = (crane) => {
  const status = crane.online ? 'normal' : 'offline';
  const hasFailures = Object.values(crane.limitSwitchStatus || {}).some(s => s === 'FAIL');
  const isOverloaded = crane.isOverloaded || false;
  
  return {
    status: crane.online ? 
      (isOverloaded ? 'overload' : 
       hasFailures ? 'warning' : 'normal') : 'offline',
    color: crane.online ? 
      (isOverloaded ? 'red' : 
       hasFailures ? 'yellow' : 'green') : 'gray'
  };
};

export const getStatusColor = (status) => {
  const colors = {
    overload: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900',
    warning: 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900',
    offline: 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800',
    normal: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900'
  };
  return colors[status] || colors.normal;
};

export const getSeverityColor = (severity) => {
  const colors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800'
  };
  return colors[severity] || 'bg-gray-100 text-gray-800';
};

