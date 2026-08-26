// context/AppContext.tsx
'use client';

import { createContext, useContext, useState, useCallback, useMemo, ReactNode, useEffect } from 'react';

export type AppState = 'home' | 'ingesting' | 'chat';

interface AppContextType {
  appState: AppState;
  docUrl: string;
  setDocUrl: (url: string) => void;
  setAppState: (state: AppState) => void;
  navigateTo: (state: AppState, url?: string) => void;
  resetToHome: () => void;
  RoomId: string | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [appState, setAppState] = useState<AppState>('home');
  const [docUrl, setDocUrl] = useState('');
  const [RoomId, setRoomId] = useState<string | null>(null);

  useEffect(() => {
    setRoomId(typeof window !== 'undefined' ? localStorage.getItem('global_room_id') : null);
  }, [appState]);

  const navigateTo = useCallback((state: AppState, url?: string) => {
    if (url) setDocUrl(url);
    setAppState(state);
  }, []);

  const resetToHome = useCallback(() => {
    setAppState('home');
    setDocUrl('');
  }, []);

  const value = useMemo(() => ({
    appState,
    docUrl,
    RoomId,
    setDocUrl,
    setAppState,
    navigateTo,
    resetToHome
  }), [appState, docUrl, RoomId, navigateTo, resetToHome]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};