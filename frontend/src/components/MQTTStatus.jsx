import { useMQTTStatus } from '../hooks/useMQTTStatus';

export default function MQTTStatus() {
  const { connected, broker, loading } = useMQTTStatus();

  if (loading) {
    return (
      <div className="flex items-center space-x-2 text-sm text-gray-500">
        <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse"></div>
        <span>MQTT Checking...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2 text-sm">
      <div className={`w-2 h-2 rounded-full ${
        connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
      }`}></div>
      <span className={connected ? 'text-green-600' : 'text-red-600'}>
        MQTT {connected ? 'Connected' : 'Disconnected'}
      </span>
      {broker !== 'Unknown' && broker !== 'Error' && (
        <span className="text-xs text-gray-500">
          ({broker})
        </span>
      )}
    </div>
  );
}
