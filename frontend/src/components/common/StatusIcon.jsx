import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function StatusIcon({ status, className = '' }) {
  const getIcon = () => {
    switch (status) {
      case 'OK':
        return <CheckCircleIcon className={`text-green-500 ${className}`} />;
      case 'FAIL':
        return <XCircleIcon className={`text-red-500 ${className}`} />;
      default:
        return <ExclamationTriangleIcon className={`text-gray-500 ${className}`} />;
    }
  };

  return (
    <div className={`w-3 h-3 rounded-full transition-all duration-300 group-hover:scale-110 relative ${
      status === 'OK' ? 'bg-transparent' :
      status === 'FAIL' ? 'bg-transparent' :
      'bg-transparent'
    }`}>
      {status === 'OK' && (
        <>
          <div className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75"></div>
          <div className="absolute inset-0 rounded-full bg-green-400 shadow-lg shadow-green-400/50 animate-pulse"></div>
          <div className="absolute inset-1 rounded-full bg-green-500 animate-pulse"></div>
        </>
      )}
      {status === 'FAIL' && (
        <>
          <div className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-75"></div>
          <div className="absolute inset-0 rounded-full bg-red-400 shadow-lg shadow-red-400/50 animate-pulse"></div>
          <div className="absolute inset-1 rounded-full bg-red-500 animate-pulse"></div>
        </>
      )}
      {status !== 'OK' && status !== 'FAIL' && (
        <div className="absolute inset-1 rounded-full bg-gray-400 animate-pulse"></div>
      )}
    </div>
  );
}

