'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface PublicNavContextValue {
  headerVisible: boolean;
  setHeaderVisible: (visible: boolean) => void;
}

const PublicNavContext = createContext<PublicNavContextValue | null>(null);

export function PublicNavProvider({ children }: { children: ReactNode }) {
  const [headerVisible, setHeaderVisibleState] = useState(true);
  const setHeaderVisible = useCallback((visible: boolean) => {
    setHeaderVisibleState(visible);
  }, []);

  return (
    <PublicNavContext.Provider value={{ headerVisible, setHeaderVisible }}>
      {children}
    </PublicNavContext.Provider>
  );
}

export function usePublicNav() {
  const ctx = useContext(PublicNavContext);
  if (!ctx) {
    return { headerVisible: true, setHeaderVisible: () => {} };
  }
  return ctx;
}
