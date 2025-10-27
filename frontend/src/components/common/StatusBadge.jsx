import { SignalIcon, SignalSlashIcon } from '@heroicons/react/24/outline';

export default function StatusBadge({ isOnline, className = '' }) {
  return (
    <div className={`flex items-center space-x-2 px-3 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
      isOnline 
        ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 group-hover:bg-green-200 dark:group-hover:bg-green-800 group-hover:shadow-lg' 
        : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 group-hover:bg-red-200 dark:group-hover:bg-red-800 group-hover:shadow-lg'
    } ${className}`}>
      {isOnline ? (
        <SignalIcon className="h-4 w-4 animate-pulse" />
      ) : (
        <SignalSlashIcon className="h-4 w-4" />
      )}
    </div>
  );
}

