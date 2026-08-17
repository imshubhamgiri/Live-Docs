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
    // 1. Generate or fetch unique ID safely
    let globalRoomId = typeof window !== 'undefined' ? localStorage.getItem('global_room_id') : null;
    if (!globalRoomId) {
      globalRoomId = `room_${Math.random().toString(36).substring(2, 11)}`;
      localStorage.setItem('global_room_id', globalRoomId);
    }

    // 2. Initialize connection - Force 'websocket' first to prevent polling overlap
    const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000', {
      autoConnect: true,
      transports: ["websocket"], // 👈 Dropping 'polling' solves local HMR port clashes
      reconnectionAttempts: 5,
    });

    // 3. Define event handlers clearly so they can be unbound during cleanup
    const handleConnect = () => {
      console.log('Connected to socket server:', socketInstance.id);
      socketInstance.emit('join_room', globalRoomId);
      setIsJoined(true);
      setError(null);
    };

    const handleDisconnect = () => {
      setIsJoined(false);
    };

    const handleConnectError = (err: Error) => {
      setError(err.message);
      console.error('Socket connection error:', err);
    };

    // Attach listeners
    socketInstance.on('connect', handleConnect);
    socketInstance.on('disconnect', handleDisconnect);
    socketInstance.on('connect_error', handleConnectError);

    setSocket(socketInstance);

    // 4. Robust Cleanup to stop HMR loops
    return () => {
      socketInstance.off('connect', handleConnect);
      socketInstance.off('disconnect', handleDisconnect);
      socketInstance.off('connect_error', handleConnectError);
      socketInstance.disconnect();
    };
  }, []);

  const contextValue = useMemo(
    () => ({ socket, isJoined, error }),
    [socket, isJoined, error]
  );

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
