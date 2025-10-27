import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './auth';

const SocketContext = createContext({});

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      // Initialize socket connection
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';
      console.log('Connecting to WebSocket:', wsUrl);
      
      const newSocket = io(wsUrl, {
        transports: ['websocket', 'polling'],
        autoConnect: true, // Auto-connect to establish WebSocket connection
        timeout: 10000, // 10 second timeout
        forceNew: true, // Force new connection
        withCredentials: true, // Send cookies with WebSocket connection
      });

      newSocket.on('connect', () => {
        console.log('WebSocket connected');
        setConnected(true);
      });

      newSocket.on('disconnect', () => {
        console.log('WebSocket disconnected');
        setConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error.message);
        console.error('WebSocket URL:', wsUrl);
        console.error('Error details:', error);
        setConnected(false);
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    }
  }, [user]);

  const subscribeToTelemetry = (craneId, callback) => {
    if (socket) {
      const eventName = `telemetry:${craneId}`;
      socket.on(eventName, callback);
      
      return () => {
        socket.off(eventName, callback);
      };
    }
    return () => {};
  };

  const subscribeToTickets = (craneId, callback) => {
    if (socket) {
      const eventName = `ticket:${craneId}`;
      socket.on(eventName, callback);
      
      return () => {
        socket.off(eventName, callback);
      };
    }
    return () => {};
  };

  const subscribeToAllTelemetry = (callback) => {
    if (socket) {
      socket.on('telemetry', callback);
      
      return () => {
        socket.off('telemetry', callback);
      };
    }
    return () => {};
  };

  const subscribeToAllTickets = (callback) => {
    if (socket) {
      socket.on('ticket', callback);
      
      return () => {
        socket.off('ticket', callback);
      };
    }
    return () => {};
  };

  const subscribeToCraneCreated = (callback) => {
    if (socket) {
      socket.on('crane:created', callback);
      
      return () => {
        socket.off('crane:created', callback);
      };
    }
    return () => {};
  };

  const subscribeToCraneUpdated = (callback) => {
    if (socket) {
      socket.on('crane:updated', callback);
      
      return () => {
        socket.off('crane:updated', callback);
      };
    }
    return () => {};
  };

  const subscribeToCraneApproved = (callback) => {
    if (socket) {
      socket.on('crane:approved', callback);
      
      return () => {
        socket.off('crane:approved', callback);
      };
    }
    return () => {};
  };

  const value = {
    socket,
    connected,
    subscribeToTelemetry,
    subscribeToTickets,
    subscribeToAllTelemetry,
    subscribeToAllTickets,
    subscribeToCraneCreated,
    subscribeToCraneUpdated,
    subscribeToCraneApproved,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
