import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { NetworkError, logout, me, saveUserLocale, setApiLocale, setUnauthorizedHandler } from './src/api';
import { AppProvider, type AppContextValue } from './src/AppContext';
import { translate, type Locale, type Params } from './src/i18n';
import { ClockIcon, TrackIcon, UserIcon } from './src/icons';
import { clearQueue, loadQueue } from './src/offlineQueue';
import LoginScreen from './src/screens/LoginScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import TimeScreen from './src/screens/TimeScreen';
import WorkdayScreen from './src/screens/WorkdayScreen';
import { clearCache, getSavedLocale, readJson, saveLocale, tokenStore, writeJson } from './src/storage';
import { colors } from './src/theme';
import type { AuthUser } from './src/types';

type Tab = 'work' | 'time' | 'profile';

function Root() {
  const [locale, setLocaleState] = useState<Locale>('de');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState<Tab>('work');
  const [loginNotice, setLoginNotice] = useState('');

  const t = useCallback((key: string, params?: Params) => translate(locale, key, params), [locale]);

  const setLocale = useCallback(
    (next: Locale) => {
      setLocaleState(next);
      setApiLocale(next);
      saveLocale(next);
      if (user) saveUserLocale(next).catch(() => {});
    },
    [user],
  );

  /** Explicit logout: everything of this account is removed from the phone. */
  const signOut = useCallback(async () => {
    await logout();
    clearCache();
    clearQueue();
    setUser(null);
    setTab('work');
  }, []);

  /** Expired token: back to login, but offline presses stay until the same person logs in again. */
  const sessionExpired = useCallback(async () => {
    await tokenStore.clear();
    setUser(null);
    setTab('work');
  }, []);

  const onLoggedIn = useCallback(async (loggedIn: AuthUser) => {
    const previous = await readJson<AuthUser | null>('me', null);
    if (previous && previous.id !== loggedIn.id) {
      // Another person on this phone: never send the previous person's presses with this account.
      clearCache();
      clearQueue();
    }
    writeJson('me', loggedIn);
    setLoginNotice('');
    setUser(loggedIn);
  }, []);

  // Start: language, offline queue, existing login.
  useEffect(() => {
    (async () => {
      const saved = await getSavedLocale();
      const initial: Locale = saved || 'de';
      setLocaleState(initial);
      setApiLocale(initial);
      await loadQueue();

      const token = await tokenStore.get();
      if (!token) {
        setChecking(false);
        return;
      }
      try {
        const response = await me();
        setUser(response.data);
        writeJson('me', response.data);
        if (!saved && (response.data.locale === 'de' || response.data.locale === 'ru')) {
          setLocaleState(response.data.locale);
          setApiLocale(response.data.locale);
        }
      } catch (error) {
        if (error instanceof NetworkError) {
          // No connection: open with the last known account so offline work is possible.
          const cached = await readJson<AuthUser | null>('me', null);
          if (cached) setUser(cached);
        } else {
          await tokenStore.clear();
        }
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  // Token rejected by the server (expired / deactivated): back to login.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setLoginNotice(translate(locale, 'sessionExpired'));
      sessionExpired();
    });
    return () => setUnauthorizedHandler(null);
  }, [locale, sessionExpired]);

  const context: AppContextValue | null = useMemo(
    () => (user ? { locale, setLocale, t, user, signOut } : null),
    [locale, setLocale, t, user, signOut],
  );

  if (checking) {
    return (
      <View style={styles.splash}>
        <TrackIcon color={colors.brassLight} size={44} />
        <ActivityIndicator color={colors.brassLight} style={{ marginTop: 24 }} />
        <StatusBar style="light" />
      </View>
    );
  }

  if (!user || !context) {
    return (
      <>
        <LoginScreen
          locale={locale}
          setLocale={setLocale}
          t={t}
          initialNotice={loginNotice}
          onLoggedIn={onLoggedIn}
        />
        <StatusBar style="light" />
      </>
    );
  }

  return (
    <AppProvider value={context}>
      <View style={{ flex: 1, backgroundColor: colors.porcelain }}>
        <View style={{ flex: 1 }}>
          {tab === 'work' ? <WorkdayScreen /> : null}
          {tab === 'time' ? <TimeScreen /> : null}
          {tab === 'profile' ? <ProfileScreen /> : null}
        </View>
        <TabBar tab={tab} onChange={setTab} t={t} />
      </View>
      <StatusBar style="light" />
    </AppProvider>
  );
}

function TabBar({ tab, onChange, t }: { tab: Tab; onChange: (tab: Tab) => void; t: (key: string) => string }) {
  const insets = useSafeAreaInsets();
  const items: Array<{ key: Tab; label: string; Icon: typeof TrackIcon }> = [
    { key: 'work', label: t('tabWork'), Icon: TrackIcon },
    { key: 'time', label: t('tabTime'), Icon: ClockIcon },
    { key: 'profile', label: t('tabProfile'), Icon: UserIcon },
  ];

  return (
    <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {items.map(({ key, label, Icon }) => {
        const active = tab === key;
        const color = active ? colors.brassLight : '#8f9db0';
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            style={styles.tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={label}
          >
            <View style={[styles.tabIndicator, active && { backgroundColor: colors.brass }]} />
            <Icon color={color} size={22} />
            <Text style={[styles.tabLabel, { color }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Root />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.ink,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  tab: { flex: 1, alignItems: 'center', gap: 4, paddingTop: 4 },
  tabIndicator: { width: 28, height: 3, borderRadius: 2, backgroundColor: 'transparent', marginBottom: 4 },
  tabLabel: { fontSize: 11.5, fontWeight: '700' },
});
