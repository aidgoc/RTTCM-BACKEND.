import { useState, useEffect } from 'react';
import axios from 'axios';

export function useMQTTStatus() {
  const [mqttStatus, setMqttStatus] = useState({
    connected: false,
    broker: 'Unknown',
    loading: true
  });

  useEffect(() => {
    const checkMQTTStatus = async () => {
      try {
        const response = await axios.get('/api/mqtt/status');
        setMqttStatus({
          connected: response.data.connected,
          broker: response.data.broker,
          loading: false
        });
      } catch (error) {
        console.error('Failed to check MQTT status:', error);
        setMqttStatus({
          connected: false,
          broker: 'Error',
          loading: false
        });
      }
    };

    // Check immediately
    checkMQTTStatus();

    // Check every 10 seconds
    const interval = setInterval(checkMQTTStatus, 10000);

    return () => clearInterval(interval);
  }, []);

  return mqttStatus;
}
