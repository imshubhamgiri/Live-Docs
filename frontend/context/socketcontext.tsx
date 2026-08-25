'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  isJoined: boolean;
  error: string | null;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let globalRoomId = typeof window !== 'undefined' ? localStorage.getItem('global_room_id') : null;
    if (!globalRoomId) {
      globalRoomId = `room_${Math.random().toString(36).substring(2, 11)}`;
      localStorage.setItem('global_room_id', globalRoomId);
    }

    const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000', {
      autoConnect: true,
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    const handleConnect = () => {
      console.log('Connected:', socketInstance.id);
      socketInstance.emit('join_room', globalRoomId);
      setIsJoined(true);
      setError(null);
    };

    const handleDisconnect = () => setIsJoined(false);

    const handleConnectError = (err: Error) => {
      console.warn('Socket connection error:', err.message);
      setError('Connection lost. Retrying...');
    };

    socketInstance.on('connect', handleConnect);
    socketInstance.on('disconnect', handleDisconnect);
    socketInstance.on('connect_error', handleConnectError);
    socketInstance.on('reconnect_attempt', attempt => console.log(`Reconnect attempt #${attempt}`));
    socketInstance.on('reconnect_error', err => console.error('Reconnect error:', err));
    socketInstance.on('reconnect_failed', () => setError('Unable to reconnect'));

    setSocket(socketInstance);

    return () => {
      socketInstance.off('connect', handleConnect);
      socketInstance.off('disconnect', handleDisconnect);
      socketInstance.off('connect_error', handleConnectError);
      socketInstance.disconnect();
    };
  }, []);

  const contextValue = useMemo(() => ({ socket, isJoined, error }), [socket, isJoined, error]);

  return <SocketContext.Provider value={contextValue}>{children}</SocketContext.Provider>;
};


export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
