import React, { createContext, useContext } from 'react';
import type { Locale, Params } from './i18n';
import type { AuthUser } from './types';

export type AppContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Params) => string;
  user: AuthUser;
  signOut: () => Promise<void>;
};

export const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp outside AppContext');
  return value;
}

export function AppProvider({ value, children }: { value: AppContextValue; children: React.ReactNode }) {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
