import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  clearToken,
  getToken,
  getWorkEvents,
  getWorkOrders,
  login,
  logout,
  me,
  postWorkEvent,
  workEventRoutes,
} from './src/api';

import { AuthUser, WorkDetails, WorkEvent, WorkOrder } from './src/types';
type Locale = 'de' | 'ru';

const mobileLocaleKey = 'rail_crm_mobile_locale';

const mobileText: Record<Locale, Record<string, string>> = {
  de: {
    tabWork: 'Arbeit',
    tabEvents: 'Ereignisse',
    tabReports: 'Berichte',
    tabProfile: 'Profil',
    reportsTitle: 'Berichte',
    reportsEmptyTitle: 'Noch leer',
    reportsEmptyText: 'Später werden hier Schichten, Stunden, Routen, GPS und Arbeitsstatistiken angezeigt.',
    profileTitle: 'Mitarbeiterprofil',
    settingsTitle: 'Einstellungen',
    language: 'Sprache',
    german: 'Deutsch',
    russian: 'Russisch',
    name: 'Name',
    email: 'E-Mail',
    role: 'Rolle',
    employeeProfileId: 'Mitarbeiterprofil ID',
    refreshData: 'Daten aktualisieren',
    logout: 'Aus App abmelden',
  },
  ru: {
    tabWork: 'Работы',
    tabEvents: 'События',
    tabReports: 'Отчёты',
    tabProfile: 'Профиль',
    reportsTitle: 'Отчёты',
    reportsEmptyTitle: 'Раздел отчётов',
    reportsEmptyText: 'Пока пусто. Позже здесь будут смены, часы, маршруты, GPS и статистика по работам.',
    profileTitle: 'Профиль сотрудника',
    settingsTitle: 'Настройки',
    language: 'Язык',
    german: 'Немецкий',
    russian: 'Русский',
    name: 'Имя',
    email: 'Email',
    role: 'Роль',
    employeeProfileId: 'Employee profile ID',
    refreshData: 'Обновить данные',
    logout: 'Выйти из приложения',
  },
};



const finishedStatuses = ['waiting_approval', 'approved', 'invoiced', 'rejected', 'cancelled', 'closed'];

function parseDetails(order?: WorkOrder | null): WorkDetails {
  if (!order?.details) return {};
  if (typeof order.details === 'object') return order.details as WorkDetails;

  try {
    return JSON.parse(order.details) as WorkDetails;
  } catch {
    return {};
  }
}

function hasEvent(events: WorkEvent[], type: string) {
  return events.some((event) => event.event_type === type);
}

function getNextAction(events: WorkEvent[], order?: WorkOrder | null) {
  if (!order) return { label: 'Выберите работу', route: '', key: 'none' };

  if (finishedStatuses.includes(String(order.status || ''))) {
    return { label: 'Работа завершена', route: '', key: 'done' };
  }

  if (!hasEvent(events, 'gasfahrt_start')) {
    return { label: 'Gasfahrt — выезд из дома', route: workEventRoutes.gasfahrtStart, key: 'gasfahrtStart' };
  }

  if (!hasEvent(events, 'gasfahrt_stop')) {
    return { label: 'Gasfahrt beendet — прибытие', route: workEventRoutes.gasfahrtStop, key: 'gasfahrtStop' };
  }

  if (!hasEvent(events, 'dienstbeginn')) {
    return { label: 'Dienstbeginn — начало работы', route: workEventRoutes.dienstbeginn, key: 'dienstbeginn' };
  }

  if (!hasEvent(events, 'arbeit_stop')) {
    return { label: 'Stop — окончание работы', route: workEventRoutes.arbeitStop, key: 'arbeitStop' };
  }

  if (!hasEvent(events, 'dienstfahrt_start')) {
    return { label: 'Dienstfahrt — выезд дальше', route: workEventRoutes.dienstfahrtStart, key: 'dienstfahrtStart' };
  }

  if (!hasEvent(events, 'dienstfahrt_stop')) {
    return { label: 'Dienstfahrt beendet', route: workEventRoutes.dienstfahrtStop, key: 'dienstfahrtStop' };
  }

  return { label: 'Рабочий цикл завершён', route: '', key: 'done' };
}

function formatDate(value?: string) {
  return value ? value.slice(0, 10) : '—';
}

function formatTime(value?: string) {
  return value ? value.slice(11, 16) : '—';
}

function plannedExceeded(order?: WorkOrder | null) {
  if (!order?.planned_end_at) return false;
  const plannedEnd = new Date(order.planned_end_at).getTime();
  return Number.isFinite(plannedEnd) && Date.now() > plannedEnd;
}

function AppContent() {
  const insets = useSafeAreaInsets();
  const [locale, setLocale] = useState<Locale>('de');

  function t(key: string) {
    return mobileText[locale]?.[key] || mobileText.de[key] || key;
  }

  async function changeLocale(nextLocale: Locale) {
    setLocale(nextLocale);
    await SecureStore.setItemAsync(mobileLocaleKey, nextLocale);
  }

  useEffect(() => {
    SecureStore.getItemAsync(mobileLocaleKey)
      .then((saved) => {
        if (saved === 'ru' || saved === 'de') setLocale(saved);
      })
      .catch(() => {});
  }, []);
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);

  const [email, setEmail] = useState('employee@example.com');
  const [password, setPassword] = useState('Employee12345!');

  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [events, setEvents] = useState<WorkEvent[]>([]);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState('');
  const [bemerkung, setBemerkung] = useState('');
  const [sortMode, setSortMode] = useState<'time_asc' | 'time_desc' | 'object' | 'customer'>('time_asc');
  const [activeTab, setActiveTab] = useState<'workday' | 'events' | 'reports' | 'profile'>('workday');

  const selectedOrder = useMemo(() => {
    return orders.find((order) => order.id === expandedOrderId) || null;
  }, [orders, expandedOrderId]);

  const selectedDetails = useMemo(() => parseDetails(selectedOrder), [selectedOrder]);
  const action = useMemo(() => getNextAction(events, selectedOrder), [events, selectedOrder]);

  const sortedOrders = useMemo(() => {
    const orderTime = (order: WorkOrder) => {
      const raw = order.planned_start_at || order.planned_end_at || '';
      const time = raw ? new Date(raw).getTime() : 0;
      return Number.isFinite(time) ? time : 0;
    };

    return [...orders].sort((a, b) => {
      const ad = parseDetails(a);
      const bd = parseDetails(b);

      if (sortMode === 'time_desc') return orderTime(b) - orderTime(a);
      if (sortMode === 'object') return String(ad.object_name || '').localeCompare(String(bd.object_name || ''));
      if (sortMode === 'customer') return String(ad.customer_name || '').localeCompare(String(bd.customer_name || ''));

      return orderTime(a) - orderTime(b);
    });
  }, [orders, sortMode]);

  const objectGroups = useMemo(() => {
    const map = new Map<string, { objectName: string; objectAddress: string; customers: Map<string, WorkOrder[]> }>();

    sortedOrders.forEach((order) => {
      const details = parseDetails(order);
      const objectName = details.object_name || 'Objekt ohne Namen';
      const objectAddress = details.object_address || '';
      const customerName = details.customer_name || 'Kunde nicht ausgewählt';
      const key = `${objectName}__${objectAddress}`;

      if (!map.has(key)) {
        map.set(key, {
          objectName,
          objectAddress,
          customers: new Map(),
        });
      }

      const group = map.get(key)!;
      const customerOrders = group.customers.get(customerName) || [];
      customerOrders.push(order);
      group.customers.set(customerName, customerOrders);
    });

    return Array.from(map.values()).map((objectGroup) => ({
      objectName: objectGroup.objectName,
      objectAddress: objectGroup.objectAddress,
      customers: Array.from(objectGroup.customers.entries()).map(([customerName, customerOrders]) => ({
        customerName,
        orders: customerOrders,
      })),
    }));
  }, [sortedOrders]);

  const loadEvents = useCallback(async (orderId: number, employeeProfileId?: number | null) => {
    const response = await getWorkEvents({
      employeeId: employeeProfileId || undefined,
      assignmentId: orderId,
    });

    setEvents(response.data || []);
  }, []);

  const loadWorkday = useCallback(async () => {
    if (!user?.employee_profile_id) return;

    setLoading(true);

    try {
      const response = await getWorkOrders(user.employee_profile_id);

      const availableOrders = (response.data || []).filter((order) => {
        return !['approved', 'invoiced', 'rejected', 'cancelled', 'closed'].includes(String(order.status || ''));
      });

      setOrders(availableOrders);

      if (expandedOrderId) {
        await loadEvents(expandedOrderId, user.employee_profile_id);
      }

      setMessage(`Загружено работ: ${availableOrders.length}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Ошибка загрузки рабочего дня');
    } finally {
      setLoading(false);
    }
  }, [expandedOrderId, loadEvents, user?.employee_profile_id]);

  const checkAuth = useCallback(async () => {
    setChecking(true);

    try {
      const token = await getToken();

      if (!token) {
        setUser(null);
        return;
      }

      const response = await me();
      setUser(response.data);
    } catch {
      await clearToken();
      setUser(null);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!user) return;

    loadWorkday();

    const timer = setInterval(() => {
      loadWorkday();
    }, 8000);

    return () => clearInterval(timer);
  }, [loadWorkday, user]);

  async function handleLogin() {
    setSaving(true);

    try {
      const response = await login(email.trim(), password);
      setUser(response.data);
      setMessage('Вход выполнен');
    } catch (error) {
      Alert.alert('Ошибка входа', error instanceof Error ? error.message : 'Login failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await logout();
    setUser(null);
    setOrders([]);
    setEvents([]);
    setExpandedOrderId(null);
  }

  async function toggleOrder(order: WorkOrder) {
    if (expandedOrderId === order.id) {
      setExpandedOrderId(null);
      setEvents([]);
      setBemerkung('');
      return;
    }

    setExpandedOrderId(order.id);
    setBemerkung('');

    if (user?.employee_profile_id) {
      await loadEvents(order.id, user.employee_profile_id);
    }
  }

  async function runAction() {
    if (!user?.employee_profile_id || !selectedOrder || !action.route) return;

    const exceeded = action.key === 'arbeitStop' && plannedExceeded(selectedOrder);

    if (exceeded && !bemerkung.trim()) {
      Alert.alert('Bemerkung обязательна', 'Плановое время превышено. Нужно заполнить Bemerkung.');
      return;
    }

    setSaving(true);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== 'granted') {
        Alert.alert('GPS недоступен', 'Разрешите геолокацию для фиксации рабочего события.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const details = parseDetails(selectedOrder);

      await postWorkEvent(action.route, {
        employee_id: user.employee_profile_id,
        assignment_id: selectedOrder.id,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        location_accuracy: location.coords.accuracy,
        bemerkung: bemerkung.trim() || undefined,
        planned_exceeded: exceeded,
        payload: {
          source: 'mobile',
          object_name: details.object_name,
          object_address: details.object_address,
          customer_name: details.customer_name,
          work_title: details.work_title || selectedOrder.title,
          leistungsart: details.leistungsart,
          referenznummer: details.referenznummer || selectedOrder.reference_number,
          zugnummer: details.zugnummer,
          einsatzort: details.einsatzort,
          planned_start: selectedOrder.planned_start_at,
          planned_stop: selectedOrder.planned_end_at,
          bemerkung: bemerkung.trim() || undefined,
        },
      });

      setBemerkung('');
      await loadEvents(selectedOrder.id, user.employee_profile_id);
      await loadWorkday();

      Alert.alert('Готово', action.label);
    } catch (error) {
      Alert.alert('Ошибка', error instanceof Error ? error.message : 'Action failed');
    } finally {
      setSaving(false);
    }
  }

  const latestLocatedEvent = [...events].reverse().find((event) => event.latitude && event.longitude);

  if (checking) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.muted}>Проверяю авторизацию...</Text>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.loginScreen}>
        <StatusBar style="light" />

        <View style={styles.loginCard}>
          <Text style={styles.logo}>Rail CRM</Text>
          <Text style={styles.loginTitle}>Вход сотрудника</Text>

          <TextInput autoCapitalize="none" keyboardType="email-address" onChangeText={setEmail} placeholder="Email" style={styles.input} value={email} />
          <TextInput onChangeText={setPassword} placeholder="Password" secureTextEntry style={styles.input} value={password} />

          <Pressable disabled={saving} onPress={handleLogin} style={[styles.primaryButton, saving && styles.disabledButton]}>
            <Text style={styles.primaryButtonText}>{saving ? 'Вхожу...' : 'Войти'}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />

      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={loadWorkday} />}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>Рабочий день</Text>
            <Text style={styles.title}>Объекты и работы</Text>
            <Text style={styles.headerMuted}>{user.name} · {user.email}</Text>
          </View>

          <Pressable onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Выйти</Text>
          </Pressable>
        </View>

        {activeTab === 'workday' ? (
        <>
        <View style={styles.sortCard}>
          <Text style={styles.cardTitle}>Сортировка</Text>

          <View style={styles.sortRow}>
            {[
              ['time_asc', 'Ранние'],
              ['time_desc', 'Поздние'],
              ['object', 'Объект'],
              ['customer', 'Клиент'],
            ].map(([key, label]) => (
              <Pressable key={key} onPress={() => setSortMode(key as typeof sortMode)} style={[styles.sortButton, sortMode === key && styles.sortButtonActive]}>
                <Text style={[styles.sortButtonText, sortMode === key && styles.sortButtonTextActive]}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Text style={styles.message}>{message}</Text>

        {objectGroups.map((objectGroup) => (
          <View style={styles.objectCard} key={`${objectGroup.objectName}-${objectGroup.objectAddress}`}>
            <Text style={styles.eyebrow}>Objekt</Text>
            <Text style={styles.objectTitle}>{objectGroup.objectName}</Text>
            {objectGroup.objectAddress ? <Text style={styles.muted}>{objectGroup.objectAddress}</Text> : null}

            {objectGroup.customers.map((customerGroup) => (
              <View style={styles.customerCard} key={`${objectGroup.objectName}-${customerGroup.customerName}`}>
                <Text style={styles.eyebrow}>Kunde</Text>
                <Text style={styles.customerTitle}>{customerGroup.customerName}</Text>

                {customerGroup.orders.map((order) => {
                  const details = parseDetails(order);
                  const expanded = order.id === expandedOrderId;
                  const finished = finishedStatuses.includes(String(order.status || ''));

                  return (
                    <View style={[styles.workCard, expanded && styles.workCardActive]} key={order.id}>
                      <Pressable onPress={() => toggleOrder(order)} style={styles.workHead}>
                        <Text style={[styles.arrow, expanded && styles.arrowOpen]}>⌄</Text>

                        <View style={styles.workHeadMain}>
                          <Text style={styles.eyebrow}>Arbeit</Text>
                          <Text style={styles.workTitle}>{details.work_title || order.title}</Text>
                          <Text style={styles.muted}>{details.einsatzort || '—'}</Text>
                        </View>

                        <View style={styles.workHeadMeta}>
                          <Text style={[styles.badge, finished && styles.doneBadge]}>{finished ? 'done' : order.status || 'planned'}</Text>
                          <Text style={styles.timeText}>{formatDate(order.planned_start_at)}</Text>
                          <Text style={styles.timeText}>{formatTime(order.planned_start_at)} — {formatTime(order.planned_end_at)}</Text>
                        </View>
                      </Pressable>

                      {expanded ? (
                        <View style={styles.workBody}>
                          {finished ? (
                            <View style={styles.finishedBox}>
                              <Text style={styles.finishedTitle}>Работа завершена</Text>
                              <Text style={styles.finishedText}>Действия по этой работе больше недоступны.</Text>
                            </View>
                          ) : (
                            <View style={styles.actionBox}>
                              <Text style={styles.eyebrow}>Действие</Text>
                              <Text style={styles.actionTitle}>{action.label}</Text>
                              <Text style={styles.muted}>GPS будет запрошен при нажатии.</Text>

                              <Pressable disabled={saving || !action.route} onPress={runAction} style={[styles.primaryButton, saving && styles.disabledButton]}>
                                <Text style={styles.primaryButtonText}>{saving ? 'Сохраняю...' : action.label}</Text>
                              </Pressable>
                            </View>
                          )}

                          <View style={styles.factItem}><Text style={styles.factLabel}>Leistungsart</Text><Text style={styles.factValue}>{details.leistungsart || '—'}</Text></View>
                          <View style={styles.factItem}><Text style={styles.factLabel}>Referenz</Text><Text style={styles.factValue}>{details.referenznummer || order.reference_number || '—'}</Text></View>
                          <View style={styles.factItem}><Text style={styles.factLabel}>Zugnummer</Text><Text style={styles.factValue}>{details.zugnummer || '—'}</Text></View>
                          <View style={styles.factItem}><Text style={styles.factLabel}>Einsatzort</Text><Text style={styles.factValue}>{details.einsatzort || '—'}</Text></View>

                          <TextInput multiline onChangeText={setBemerkung} placeholder="Bemerkung" style={[styles.input, styles.textarea]} value={bemerkung} />
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        ))}

        </>
        ) : null}

        {activeTab === 'events' ? (
        <View style={styles.bottomCard}>
          <Text style={styles.cardTitle}>Лог / GPS / Лента событий</Text>

          <View style={styles.bottomBlock}>
            <Text style={styles.bottomTitle}>Google Maps позиция</Text>

            {latestLocatedEvent?.latitude && latestLocatedEvent.longitude ? (
              <Pressable onPress={() => Linking.openURL(`https://www.google.com/maps?q=${latestLocatedEvent.latitude},${latestLocatedEvent.longitude}`)}>
                <Text style={styles.link}>Открыть последнюю точку</Text>
              </Pressable>
            ) : (
              <Text style={styles.muted}>GPS появится после первого действия.</Text>
            )}
          </View>

          <View style={styles.bottomBlock}>
            <Text style={styles.bottomTitle}>Лента событий</Text>

            {events.length === 0 ? <Text style={styles.muted}>Пока событий нет.</Text> : null}

            {events.slice().reverse().slice(0, 8).map((event) => (
              <View style={styles.eventLine} key={event.id}>
                <Text style={styles.eventType}>{event.event_type}</Text>
                <Text style={styles.muted}>{event.event_time}</Text>
              </View>
            ))}
          </View>
        </View>
        ) : null}

        {activeTab === 'reports' ? (
          <View style={styles.profileCard}>
            <Text style={styles.cardTitle}>{t('reportsTitle')}</Text>
            <View style={styles.emptyReportsBox}>
              <Text style={styles.emptyReportsIcon}>📊</Text>
              <Text style={styles.emptyReportsTitle}>{t('reportsEmptyTitle')}</Text>
              <Text style={styles.muted}>{t('reportsEmptyText')}</Text>
            </View>
          </View>
        ) : null}

        {activeTab === 'profile' ? (
          <View style={styles.profileCard}>
            <Text style={styles.cardTitle}>{t('profileTitle')}</Text>

            <View style={styles.languageSettingsBox}>
              <Text style={styles.profileLabel}>{t('settingsTitle')}</Text>
              <Text style={styles.settingsTitle}>{t('language')}</Text>

              <View style={styles.languageButtons}>
                <Pressable
                  onPress={() => changeLocale('de')}
                  style={[styles.languageButton, locale === 'de' && styles.languageButtonActive]}
                >
                  <Text style={[styles.languageButtonText, locale === 'de' && styles.languageButtonTextActive]}>DE · {t('german')}</Text>
                </Pressable>

                <Pressable
                  onPress={() => changeLocale('ru')}
                  style={[styles.languageButton, locale === 'ru' && styles.languageButtonActive]}
                >
                  <Text style={[styles.languageButtonText, locale === 'ru' && styles.languageButtonTextActive]}>RU · {t('russian')}</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>{t('name')}</Text>
              <Text style={styles.profileValue}>{user.name}</Text>
            </View>

            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>{t('email')}</Text>
              <Text style={styles.profileValue}>{user.email}</Text>
            </View>

            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>{t('role')}</Text>
              <Text style={styles.profileValue}>{user.role}</Text>
            </View>

            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>{t('employeeProfileId')}</Text>
              <Text style={styles.profileValue}>{user.employee_profile_id || '—'}</Text>
            </View>

            <Pressable onPress={loadWorkday} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>{t('refreshData')}</Text>
            </Pressable>

            <Pressable onPress={handleLogout} style={styles.dangerButton}>
              <Text style={styles.dangerButtonText}>{t('logout')}</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      {/* floating bottom mobile tabs */}
      <View style={[styles.mobileTabs, { bottom: Math.max(insets.bottom, 12) + 8 }]}>
        {([
          { key: 'workday', icon: '📋', label: t('tabWork') },
          { key: 'events', icon: '📍', label: t('tabEvents') },
          { key: 'reports', icon: '📊', label: t('tabReports') },
          { key: 'profile', icon: '👤', label: t('tabProfile') },
        ] as const).map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={[styles.mobileTab, activeTab === tab.key && styles.mobileTabActive]}
          >
            <Text style={[styles.mobileTabIcon, activeTab === tab.key && styles.mobileTabTextActive]}>{tab.icon}</Text>
            <Text style={[styles.mobileTabText, activeTab === tab.key && styles.mobileTabTextActive]}>{tab.label}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}


export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}


const styles = StyleSheet.create({
  mobileTabs: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 14,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 7,
    flexDirection: 'row',
    shadowColor: '#0f172a',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 14
  },
  mobileTab: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center'
  },
  mobileTabActive: {
    backgroundColor: '#2563eb'
  },
  mobileTabText: {
    color: '#334155',
    fontWeight: '900',
    fontSize: 11
  },
  mobileTabTextActive: {
    color: '#ffffff'
  },
  mobileTabIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  emptyReportsBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
  },
  emptyReportsIcon: {
    fontSize: 42,
    marginBottom: 10,
  },
  emptyReportsTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 6,
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
  },
  languageSettingsBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  settingsTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 10,
  },
  languageButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  languageButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  languageButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  languageButtonText: {
    color: '#334155',
    fontWeight: '900',
    fontSize: 12,
  },
  languageButtonTextActive: {
    color: '#ffffff',
  },
  profileRow: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  profileLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  profileValue: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '900',
  },
  secondaryButton: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryButtonText: {
    color: '#2563eb',
    fontWeight: '900',
  },
  dangerButton: {
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 10,
  },
  dangerButtonText: {
    color: '#991b1b',
    fontWeight: '900',
  },
  screen: { flex: 1, backgroundColor: '#eef2f7' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loginScreen: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', padding: 20 },
  loginCard: { backgroundColor: '#ffffff', borderRadius: 24, padding: 22 },
  logo: { color: '#2563eb', fontSize: 16, fontWeight: '900', marginBottom: 16 },
  loginTitle: { color: '#0f172a', fontSize: 28, fontWeight: '900', marginBottom: 18 },
  content: { padding: 16, paddingBottom: 125 },
  header: { backgroundColor: '#0f172a', borderRadius: 22, padding: 18, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between' },
  headerText: { flex: 1, paddingRight: 10 },
  eyebrow: { color: '#64748b', fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  title: { color: '#ffffff', fontSize: 25, fontWeight: '900' },
  headerMuted: { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 4 },
  muted: { color: '#64748b', fontSize: 13, lineHeight: 18 },
  logoutButton: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start' },
  logoutText: { color: '#ffffff', fontWeight: '800' },
  sortCard: { backgroundColor: '#ffffff', borderRadius: 18, padding: 14, marginBottom: 12 },
  cardTitle: { color: '#0f172a', fontSize: 18, fontWeight: '900', marginBottom: 10 },
  sortRow: { flexDirection: 'row', flexWrap: 'wrap' },
  sortButton: { backgroundColor: '#f1f5f9', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, marginBottom: 8 },
  sortButtonActive: { backgroundColor: '#2563eb' },
  sortButtonText: { color: '#334155', fontWeight: '800' },
  sortButtonTextActive: { color: '#ffffff' },
  message: { color: '#475569', marginBottom: 10 },
  objectCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 14, marginBottom: 14 },
  objectTitle: { color: '#0f172a', fontSize: 22, fontWeight: '900' },
  customerCard: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 12, marginTop: 12 },
  customerTitle: { color: '#0f172a', fontSize: 17, fontWeight: '900', marginBottom: 10 },
  workCard: { backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: 16, borderWidth: 1, marginBottom: 10, overflow: 'hidden' },
  workCardActive: { borderColor: '#2563eb' },
  workHead: { flexDirection: 'row', padding: 12, alignItems: 'center' },
  arrow: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#f1f5f9', color: '#2563eb', textAlign: 'center', lineHeight: 34, fontSize: 22, fontWeight: '900', marginRight: 10 },
  arrowOpen: { backgroundColor: '#2563eb', color: '#ffffff', transform: [{ rotate: '180deg' }] },
  workHeadMain: { flex: 1 },
  workTitle: { color: '#0f172a', fontSize: 17, fontWeight: '900' },
  workHeadMeta: { alignItems: 'flex-end', maxWidth: 130 },
  badge: { backgroundColor: '#f1f5f9', color: '#334155', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, overflow: 'hidden', fontSize: 11, fontWeight: '900', marginBottom: 4 },
  doneBadge: { backgroundColor: '#dcfce7', color: '#166534' },
  timeText: { color: '#64748b', fontSize: 11 },
  workBody: { borderTopWidth: 1, borderColor: '#e2e8f0', padding: 12 },
  actionBox: { backgroundColor: '#f8fafc', borderRadius: 14, padding: 12, marginBottom: 12 },
  actionTitle: { color: '#0f172a', fontSize: 18, fontWeight: '900', marginBottom: 8 },
  primaryButton: { backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 13, paddingHorizontal: 14, alignItems: 'center', marginTop: 10 },
  primaryButtonText: { color: '#ffffff', fontWeight: '900', textAlign: 'center' },
  disabledButton: { opacity: 0.55 },
  finishedBox: { backgroundColor: '#ecfdf5', borderRadius: 14, padding: 12, marginBottom: 12 },
  finishedTitle: { color: '#065f46', fontSize: 17, fontWeight: '900' },
  finishedText: { color: '#047857', marginTop: 4 },
  factItem: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 10, marginBottom: 8 },
  factLabel: { color: '#64748b', fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  factValue: { color: '#0f172a', fontWeight: '900', marginTop: 3 },
  input: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, color: '#0f172a', marginBottom: 10 },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  bottomCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 14, marginTop: 4 },
  bottomBlock: { backgroundColor: '#f8fafc', borderRadius: 14, padding: 12, marginTop: 10 },
  bottomTitle: { color: '#0f172a', fontSize: 16, fontWeight: '900', marginBottom: 6 },
  link: { color: '#2563eb', fontWeight: '900' },
  eventLine: { borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 8, marginTop: 8 },
  eventType: { color: '#0f172a', fontWeight: '900' },
});
