import * as Location from 'expo-location';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ACTION_ROUTES,
  ApiError,
  NEXT_ACTION,
  NetworkError,
  STATE_AFTER,
  errorMessage,
  getFieldState,
  getWorkEvents,
  getWorkOrders,
  postWorkEvent,
} from '../api';
import { useApp } from '../AppContext';
import { addDays, dmy, hhmm, isoDate, localIsoDate, monthRange, weekday } from '../i18n';
import { enqueue, flushQueue, getQueue, lastQueuedAction, loadQueue, subscribeQueue, type QueuedEvent } from '../offlineQueue';
import { readJson, writeJson } from '../storage';
import { colors, font, radius } from '../theme';
import type { FieldState, WorkDetails, WorkEvent, WorkEventPayload, WorkOrder } from '../types';
import { Badge, Button, Card, Chip, DateField, KeyValue, Notice, Segmented, styles as ui, type Tone } from '../ui';

const FINISHED_STATUSES = ['waiting_approval', 'approved', 'invoiced', 'rejected', 'cancelled', 'closed'];
const HIDDEN_STATUSES = ['draft'];
const WORK_TYPES = ['WTU', 'WSU', 'E-WU', 'Rb', 'Azf', 'RID-Kontrolle', 'Zugbeschtreifung'];

type Filter = 'current' | 'completed' | 'all';

function details(order?: WorkOrder | null): WorkDetails {
  if (!order?.details) return {};
  if (typeof order.details === 'object') return order.details as WorkDetails;
  try {
    return JSON.parse(order.details) as WorkDetails;
  } catch {
    return {};
  }
}

function statusTone(status?: string | null): Tone {
  switch (status) {
    case 'in_progress':
      return 'blue';
    case 'waiting_approval':
      return 'amber';
    case 'approved':
    case 'invoiced':
      return 'green';
    case 'rejected':
    case 'cancelled':
      return 'red';
    default:
      return 'neutral';
  }
}

function sortTime(order: WorkOrder) {
  return order.planned_start_at || order.planned_end_at || '';
}

async function currentPosition(): Promise<{ latitude?: number; longitude?: number; location_accuracy?: number; denied?: boolean }> {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') return { denied: true };
    const fix = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 9000)),
    ]);
    const position = fix || (await Location.getLastKnownPositionAsync());
    if (!position) return {};
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      location_accuracy: position.coords.accuracy ? Math.round(position.coords.accuracy) : undefined,
    };
  } catch {
    return {};
  }
}

export default function WorkdayScreen() {
  const { t, locale, user } = useApp();
  const insets = useSafeAreaInsets();
  const employeeId = user.employee_profile_id ? Number(user.employee_profile_id) : null;

  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [events, setEvents] = useState<WorkEvent[]>([]);
  const [fieldStates, setFieldStates] = useState<Record<number, FieldState>>({});
  const [queue, setQueue] = useState<QueuedEvent[]>(getQueue());
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [filter, setFilter] = useState<Filter>('current');
  const [period, setPeriod] = useState(monthRange(0));
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [workType, setWorkType] = useState('WTU');
  const [workTypeCustom, setWorkTypeCustom] = useState('');
  const [remark, setRemark] = useState('');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<{ tone: Tone; text: string } | null>(null);
  const [gpsText, setGpsText] = useState('');
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    loadQueue().then(setQueue);
    const unsubscribe = subscribeQueue(setQueue);
    return () => {
      mounted.current = false;
      unsubscribe();
    };
  }, []);

  const syncQueue = useCallback(async () => {
    const result = await flushQueue();
    if (result.sent && mounted.current) setNotice({ tone: 'green', text: t('offlineSynced', { count: result.sent }) });
    if (result.rejected.length && mounted.current) setNotice({ tone: 'red', text: t('offlineRejected', { error: result.rejected.join('; ') }) });
    return result;
  }, [t]);

  const load = useCallback(async () => {
    if (!employeeId) {
      setLoading(false);
      return;
    }
    await syncQueue();
    try {
      const [orderResponse, eventResponse] = await Promise.all([getWorkOrders(employeeId), getWorkEvents(employeeId)]);
      if (!mounted.current) return;
      setOrders(orderResponse.data || []);
      setEvents(eventResponse.data || []);
      writeJson('orders', orderResponse.data || []);
      writeJson('events', eventResponse.data || []);
      setOffline(false);
    } catch (error) {
      if (error instanceof NetworkError) {
        const [cachedOrders, cachedEvents] = await Promise.all([readJson<WorkOrder[]>('orders', []), readJson<WorkEvent[]>('events', [])]);
        if (!mounted.current) return;
        setOrders(cachedOrders);
        setEvents(cachedEvents);
        setOffline(true);
      } else if (mounted.current) {
        setNotice({ tone: 'red', text: errorMessage(error, t('unknownError')) });
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [employeeId, syncQueue, t]);

  const loadFieldState = useCallback(
    async (orderId: number) => {
      if (!employeeId) return;
      try {
        const state = await getFieldState(employeeId, orderId);
        if (!mounted.current) return;
        setFieldStates((current) => {
          const next = { ...current, [orderId]: state };
          writeJson('field-states', next);
          return next;
        });
      } catch (error) {
        if (error instanceof NetworkError) {
          const cached = await readJson<Record<number, FieldState>>('field-states', {});
          if (mounted.current && cached[orderId]) setFieldStates((current) => ({ ...current, [orderId]: cached[orderId] }));
        }
      }
    },
    [employeeId],
  );

  useEffect(() => {
    load();
    const timer = setInterval(load, 60000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') load();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [load]);

  const finishedIds = useMemo(
    () => new Set(events.filter((event) => event.event_type === 'arbeit_stop' && event.assignment_id).map((event) => Number(event.assignment_id))),
    [events],
  );

  const isFinished = useCallback(
    (order: WorkOrder) => FINISHED_STATUSES.includes(String(order.status || '')) || finishedIds.has(order.id) || lastQueuedAction(order.id) === 'arbeit_stop',
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [finishedIds, queue],
  );

  const visibleOrders = useMemo(() => {
    const list = orders.filter((order) => !HIDDEN_STATUSES.includes(String(order.status || '')));
    const filtered = list.filter((order) => {
      const finished = isFinished(order);
      if (filter === 'current') return !finished;
      const date = isoDate(order.planned_start_at);
      const inPeriod = !date || (date >= period.from && date <= period.to);
      if (filter === 'completed') return finished && inPeriod;
      return inPeriod;
    });
    return filtered.sort((a, b) => (filter === 'current' ? sortTime(a).localeCompare(sortTime(b)) : sortTime(b).localeCompare(sortTime(a))));
  }, [orders, filter, period, isFinished]);

  const groups = useMemo(() => {
    const map = new Map<string, WorkOrder[]>();
    visibleOrders.forEach((order) => {
      const key = isoDate(order.planned_start_at) || '';
      map.set(key, [...(map.get(key) || []), order]);
    });
    return [...map.entries()];
  }, [visibleOrders]);

  function dayLabel(date: string) {
    if (!date) return t('noDate');
    const today = localIsoDate();
    const prefix = date === today ? `${t('today')} · ` : date === addDays(today, 1) ? `${t('tomorrow')} · ` : '';
    return `${prefix}${weekday(locale, date)} ${dmy(date)}`;
  }

  function toggle(order: WorkOrder) {
    if (expandedId === order.id) {
      setExpandedId(null);
      return;
    }
    const d = details(order);
    setExpandedId(order.id);
    setWorkType(d.leistungsart && WORK_TYPES.includes(d.leistungsart) ? d.leistungsart : d.leistungsart ? '' : 'WTU');
    setWorkTypeCustom(d.leistungsart && !WORK_TYPES.includes(d.leistungsart) ? d.leistungsart : '');
    setRemark('');
    setGpsText('');
    setNotice(null);
    loadFieldState(order.id);
  }

  /** Server state, moved on by presses that are still waiting offline. */
  function effectiveState(order: WorkOrder): FieldState {
    const orderEvents = events
      .filter((event) => Number(event.assignment_id) === order.id)
      .sort((a, b) => a.event_time.localeCompare(b.event_time));
    const base: FieldState = fieldStates[order.id] || {
      employee_id: employeeId || 0,
      assignment_id: order.id,
      current_state: 'idle',
      allowed_actions: [orderEvents.length ? NEXT_ACTION[orderEvents[orderEvents.length - 1].event_type] || 'gasfahrt_start' : 'gasfahrt_start'],
      required_fields: [],
      planned_exceeded: false,
      requires_bemerkung: false,
      leistungsart_options: WORK_TYPES,
    };
    const pending = lastQueuedAction(order.id);
    if (!pending) return base;
    return {
      ...base,
      allowed_actions: [NEXT_ACTION[pending] || pending],
      current_state: STATE_AFTER[pending] || base.current_state,
      requires_bemerkung: false,
    };
  }

  async function press(order: WorkOrder, action: string) {
    if (!employeeId) return;
    const state = effectiveState(order);
    const realWorkType = workType === '' ? workTypeCustom.trim() : workType;

    if (action === 'arbeit_stop' && state.requires_bemerkung && !remark.trim()) {
      setNotice({ tone: 'red', text: t('remarkRequired') });
      return;
    }
    if (action === 'dienstbeginn' && !realWorkType) {
      setNotice({ tone: 'red', text: t('workTypeRequired') });
      return;
    }

    const confirmed = await new Promise<boolean>((resolve) => {
      Alert.alert(t('confirmTitle'), t('confirmAction', { action: t(`short_${action}`) }), [
        { text: t('cancel'), style: 'cancel', onPress: () => resolve(false) },
        { text: t('confirmYes'), onPress: () => resolve(true) },
      ]);
    });
    if (!confirmed) return;

    setSending(true);
    setNotice(null);
    setGpsText(t('gpsAsking'));

    const position = await currentPosition();
    setGpsText(position.latitude ? t('gpsOk', { accuracy: position.location_accuracy ?? '?' }) : t('gpsDenied'));
    const { denied, ...coords } = position;
    if (denied) Alert.alert(t('gpsDeniedTitle'), t('gpsDeniedText'));

    const d = details(order);
    const now = new Date();
    const payload: WorkEventPayload = {
      employee_id: employeeId,
      assignment_id: order.id,
      ...coords,
      planned_exceeded: Boolean(state.planned_exceeded),
      bemerkung: remark.trim() || undefined,
      payload: {
        source: 'mobile-app',
        action_label: t(`action_${action}`),
        date: localIsoDate(now),
        object_name: d.object_name,
        object_address: d.object_address,
        customer_name: d.customer_name,
        work_title: d.work_title || order.title,
        leistungsart: realWorkType || d.leistungsart,
        referenznummer: order.reference_number || d.referenznummer,
        zugnummer: d.zugnummer,
        einsatzort: d.object_address || d.einsatzort,
        planned_start: hhmm(order.planned_start_at),
        planned_stop: hhmm(order.planned_end_at),
        bemerkung: remark.trim() || undefined,
        client_time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      },
    };
    const path = ACTION_ROUTES[action];

    try {
      // Older offline presses must reach the server first.
      if (getQueue().length > 0) throw new NetworkError('queue not empty');
      await postWorkEvent(path, payload);
      setNotice({ tone: 'green', text: t('saved', { action: t(`short_${action}`) }) });
      setRemark('');
      await Promise.all([load(), loadFieldState(order.id)]);
    } catch (error) {
      if (error instanceof NetworkError) {
        enqueue(action, path, payload);
        setNotice({ tone: 'amber', text: t('savedOffline', { action: t(`short_${action}`) }) });
        setRemark('');
        syncQueue().then((result) => {
          if (result.sent) {
            load();
            loadFieldState(order.id);
          }
        });
      } else {
        setNotice({ tone: 'red', text: errorMessage(error, t('unknownError')) });
        if (error instanceof ApiError) loadFieldState(order.id);
      }
    } finally {
      setSending(false);
    }
  }

  function openMap(address: string) {
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`).catch(() => {});
  }

  const ownQueue = (orderId: number) => queue.filter((item) => item.assignmentId === orderId);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.porcelain }}
      contentContainerStyle={{ paddingBottom: 24 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.brass} />}
    >
      <View style={[styles.header, { paddingTop: insets.top + 18 }]}>
        <Text style={styles.headerHello}>{t('hello', { name: user.name.split(' ')[0] || user.name })}</Text>
        <Text style={styles.headerIntro}>{t('workIntro')}</Text>
      </View>

      <View style={styles.body}>
        {queue.length > 0 ? (
          <Notice tone="amber" text={t('offlinePending', { count: queue.length })} action={{ label: t('offlineSendNow'), onPress: () => syncQueue().then(load) }} />
        ) : null}
        {offline ? <Notice tone="neutral" text={t('noConnection')} /> : null}
        {!employeeId ? <Notice tone="red" text={t('noProfile')} /> : null}

        <Segmented<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'current', label: t('filterCurrent') },
            { value: 'completed', label: t('filterCompleted') },
            { value: 'all', label: t('filterAll') },
          ]}
        />

        {filter !== 'current' ? (
          <View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <DateField label={t('from')} value={period.from} maximum={period.to} onChange={(from) => setPeriod({ ...period, from })} />
              <DateField label={t('to')} value={period.to} minimum={period.from} onChange={(to) => setPeriod({ ...period, to })} />
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Chip label={t('thisMonth')} onPress={() => setPeriod(monthRange(0))} />
              <Chip label={t('lastMonth')} onPress={() => setPeriod(monthRange(-1))} />
            </View>
          </View>
        ) : null}

        {loading ? <Text style={ui.hint}>{t('loading')}</Text> : null}
        {!loading && employeeId && groups.length === 0 ? (
          <Card>
            <Text style={styles.empty}>{filter === 'current' ? t('noOrdersCurrent') : t('noOrders')}</Text>
          </Card>
        ) : null}

        {groups.map(([date, dayOrders]) => (
          <View key={date || 'none'} style={{ gap: 10 }}>
            <Text style={styles.dayLabel}>{dayLabel(date)}</Text>
            {dayOrders.map((order) => {
              const d = details(order);
              const expanded = expandedId === order.id;
              const finished = isFinished(order);
              const address = d.object_address || d.einsatzort || '';
              const state = expanded ? effectiveState(order) : null;
              const action = state?.allowed_actions?.[0] || 'gasfahrt_start';
              const orderEvents = events
                .filter((event) => Number(event.assignment_id) === order.id)
                .sort((a, b) => a.event_time.localeCompare(b.event_time));
              const pending = ownQueue(order.id);
              const busyElsewhere = Boolean(
                state && state.last_assignment_id && state.last_assignment_id !== order.id && ['work_active', 'gasfahrt_active', 'dienstfahrt_active'].includes(state.current_state),
              );

              return (
                <Card key={order.id} style={[styles.orderCard, expanded && styles.orderCardOpen]}>
                  <Pressable onPress={() => toggle(order)} accessibilityRole="button" accessibilityState={{ expanded }}>
                    <View style={styles.orderTop}>
                      <View style={styles.timeBlock}>
                        <Text style={styles.timeStart}>{hhmm(order.planned_start_at)}</Text>
                        <Text style={styles.timeEnd}>{hhmm(order.planned_end_at)}</Text>
                      </View>
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text style={styles.orderTitle} numberOfLines={2}>{d.work_title || order.title}</Text>
                        <Text style={styles.orderMeta} numberOfLines={1}>{[d.customer_name, d.object_name].filter(Boolean).join(' · ') || '—'}</Text>
                        <View style={{ flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                          <Badge label={finished && !FINISHED_STATUSES.includes(String(order.status)) ? t('status_done') : t(`status_${order.status || 'planned'}`)} tone={finished ? 'green' : statusTone(order.status)} />
                          {order.reference_number ? <Badge label={order.reference_number} tone="brass" /> : null}
                          {pending.length ? <Badge label={`offline ${pending.length}`} tone="amber" /> : null}
                        </View>
                      </View>
                      <Text style={[styles.chevron, expanded && { transform: [{ rotate: '180deg' }] }]}>⌄</Text>
                    </View>
                  </Pressable>

                  {expanded ? (
                    <View style={styles.orderBody}>
                      {finished ? (
                        <Notice tone="green" text={`${t('orderFinished')} ${t('orderFinishedHint')}`} />
                      ) : (
                        <View style={styles.actionBox}>
                          <Text style={styles.actionEyebrow}>{t('currentState')}</Text>
                          <Text style={styles.actionState}>{t(`state_${state?.current_state || 'idle'}`)}</Text>
                          {busyElsewhere ? <Notice tone="amber" text={t('otherOrderActive')} /> : null}

                          {action === 'dienstbeginn' ? (
                            <View style={{ marginTop: 12 }}>
                              <Text style={[ui.label, { color: '#c3ccd7' }]}>{t('workType')}</Text>
                              <View style={styles.chips}>
                                {WORK_TYPES.map((type) => (
                                  <Chip key={type} label={type} active={workType === type} onPress={() => setWorkType(type)} />
                                ))}
                                <Chip label={t('workTypeCustom')} active={workType === ''} onPress={() => setWorkType('')} />
                              </View>
                              {workType === '' ? (
                                <TextInput
                                  value={workTypeCustom}
                                  onChangeText={setWorkTypeCustom}
                                  placeholder={t('workTypeCustomPlaceholder')}
                                  placeholderTextColor={colors.slate2}
                                  style={[ui.input, { marginTop: 8 }]}
                                />
                              ) : null}
                            </View>
                          ) : null}

                          {action === 'arbeit_stop' && state?.requires_bemerkung ? <View style={{ marginTop: 12 }}><Notice tone="red" text={t('remarkRequired')} /></View> : null}

                          <Button
                            big
                            variant="brass"
                            label={sending ? t('sending') : t(`action_${action}`)}
                            busy={sending}
                            disabled={!employeeId}
                            onPress={() => press(order, action)}
                            style={{ marginTop: 14 }}
                          />
                          {gpsText ? <Text style={styles.gpsText}>{gpsText}</Text> : null}
                        </View>
                      )}

                      {notice ? <Notice tone={notice.tone} text={notice.text} /> : null}

                      {!finished ? (
                        <View>
                          <Text style={ui.label}>{t('remark')}</Text>
                          <TextInput
                            value={remark}
                            onChangeText={setRemark}
                            placeholder={t('remarkPlaceholder')}
                            placeholderTextColor={colors.slate2}
                            multiline
                            style={[ui.input, ui.inputMultiline]}
                          />
                        </View>
                      ) : null}

                      <View style={styles.kvGrid}>
                        <KeyValue label={t('plannedTime')} value={`${dmy(order.planned_start_at)} ${hhmm(order.planned_start_at)}–${hhmm(order.planned_end_at)}`} />
                        <KeyValue label={t('workType')} value={d.leistungsart} />
                        <KeyValue label={t('reference')} value={order.reference_number || d.referenznummer} />
                        <KeyValue label={t('trainNumber')} value={d.zugnummer} />
                        <KeyValue label={t('customer')} value={d.customer_name} />
                        <KeyValue label={t('object')} value={d.object_name} />
                      </View>

                      {address ? (
                        <Pressable onPress={() => openMap(address)} style={styles.mapRow} accessibilityRole="link">
                          <View style={{ flex: 1 }}>
                            <Text style={ui.kvLabel}>{t('location')}</Text>
                            <Text style={ui.kvValue}>{address}</Text>
                          </View>
                          <Text style={styles.mapLink}>{t('openMap')} ›</Text>
                        </Pressable>
                      ) : null}

                      <Text style={ui.hint}>{t('tariffHint')}</Text>

                      <View>
                        <Text style={[ui.label, { marginTop: 4 }]}>{t('eventsOfOrder')}</Text>
                        {orderEvents.length === 0 && pending.length === 0 ? <Text style={ui.hint}>{t('noEventsYet')}</Text> : null}
                        {orderEvents.map((event) => (
                          <View key={event.id} style={styles.eventRow}>
                            <Text style={styles.eventTime}>{hhmm(event.event_time)}</Text>
                            <Text style={styles.eventLabel}>{t(`short_${event.event_type}`)}</Text>
                            <Text style={styles.eventDate}>{dmy(event.event_time)}</Text>
                          </View>
                        ))}
                        {pending.map((item) => (
                          <View key={item.id} style={styles.eventRow}>
                            <Text style={styles.eventTime}>{new Date(item.queuedAt).toTimeString().slice(0, 5)}</Text>
                            <Text style={styles.eventLabel}>{t(`short_${item.action}`)}</Text>
                            <Badge label="offline" tone="amber" />
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : null}
                </Card>
              );
            })}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: colors.ink, paddingHorizontal: 20, paddingBottom: 26, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerHello: { color: '#fff', fontSize: font.h1, fontWeight: '700', letterSpacing: -0.3 },
  headerIntro: { color: '#aeb9c7', fontSize: font.small, marginTop: 6, lineHeight: 19 },
  body: { padding: 16, gap: 14 },
  empty: { color: colors.slate, fontSize: font.body, textAlign: 'center', paddingVertical: 12 },
  dayLabel: { fontSize: font.small, fontWeight: '700', color: colors.slate, marginTop: 4, marginLeft: 2 },
  orderCard: { padding: 14 },
  orderCardOpen: { borderColor: colors.brass },
  orderTop: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  timeBlock: { width: 54, paddingVertical: 6, borderRadius: radius.md, backgroundColor: colors.porcelain, alignItems: 'center' },
  timeStart: { fontSize: font.h3, fontWeight: '700', color: colors.ink },
  timeEnd: { fontSize: font.tiny, color: colors.slate, marginTop: 2 },
  orderTitle: { fontSize: font.h3, fontWeight: '700', color: colors.ink },
  orderMeta: { fontSize: font.small, color: colors.slate },
  chevron: { fontSize: 22, color: colors.slate, lineHeight: 24, marginTop: -2 },
  orderBody: { marginTop: 14, gap: 14, borderTopWidth: 1, borderTopColor: colors.hairline, paddingTop: 14 },
  actionBox: { backgroundColor: colors.ink, borderRadius: radius.lg, padding: 16 },
  actionEyebrow: { color: '#8f9db0', fontSize: font.tiny, fontWeight: '700' },
  actionState: { color: '#fff', fontSize: font.h2, fontWeight: '700', marginTop: 2, marginBottom: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gpsText: { color: '#aeb9c7', fontSize: font.tiny, marginTop: 10, textAlign: 'center' },
  kvGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 12, columnGap: 12 },
  mapRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.md, backgroundColor: colors.porcelain },
  mapLink: { color: colors.ink, fontWeight: '700', fontSize: font.small },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.porcelain },
  eventTime: { width: 48, fontWeight: '700', color: colors.ink, fontSize: font.body },
  eventLabel: { flex: 1, color: colors.ink, fontSize: font.small },
  eventDate: { color: colors.slate, fontSize: font.tiny },
});
