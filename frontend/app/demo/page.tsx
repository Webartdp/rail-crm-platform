'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  getWorkEvents,
  getWorkOrders,
  postWorkEvent,
  type DemoWorkOrder,
  type WorkEvent,
  workEventRoutes,
} from '../../lib/api';
import { me } from '../../lib/auth';
import { getFieldState, type FieldState } from '../../lib/field-state';
import { useI18n } from '../i18n';

const leistungsartOptions = ['', 'WTU', 'WSU', 'E-WU', 'Rb', 'Azf', 'RID-Kontrolle', 'Zugbeschtreifung'];

const routeByAction: Record<string, string> = {
  gasfahrt_start: workEventRoutes.gasfahrtStart,
  gasfahrt_stop: workEventRoutes.gasfahrtStop,
  dienstbeginn: workEventRoutes.dienstbeginn,
  arbeit_stop: workEventRoutes.arbeitStop,
  dienstfahrt_start: workEventRoutes.dienstfahrtStart,
  dienstfahrt_stop: workEventRoutes.dienstfahrtStop,
};

const actionLabelKeys: Record<string, string> = {
  gasfahrt_start: 'actionGasfahrtStart',
  gasfahrt_stop: 'actionGasfahrtStop',
  dienstbeginn: 'actionDienstbeginn',
  arbeit_stop: 'actionArbeitStop',
  dienstfahrt_start: 'actionDienstfahrtStart',
  dienstfahrt_stop: 'actionDienstfahrtStop',
};

const stateLabelKeys: Record<string, string> = {
  idle: 'stateIdle',
  gasfahrt_active: 'stateGasfahrtActive',
  arrived: 'stateArrived',
  work_active: 'stateWorkActive',
  work_finished: 'stateWorkFinished',
  dienstfahrt_active: 'stateDienstfahrtActive',
  dienstfahrt_finished: 'stateDienstfahrtFinished',
};

type WorkDetails = {
  object_name?: string;
  object_address?: string;
  customer_name?: string;
  work_title?: string;
  leistungsart?: string;
  zugnummer?: string;
  einsatzort?: string;
};

type PositionPayload = {
  latitude?: number;
  longitude?: number;
  location_accuracy?: number;
};

type Translator = (key: string, params?: Record<string, string | number>) => string;

function today() {
  return new Date().toISOString().slice(0, 10);
}

function localeCode(locale: 'ru' | 'de') {
  return locale === 'de' ? 'de-DE' : 'ru-RU';
}

function timeNow(locale: 'ru' | 'de') {
  return new Intl.DateTimeFormat(localeCode(locale), { hour: '2-digit', minute: '2-digit' }).format(new Date());
}

function formatDateTime(value: string | null | undefined, locale: 'ru' | 'de') {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat(localeCode(locale), {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function parseDetails(order?: DemoWorkOrder | null): WorkDetails {
  if (!order?.details) return {};

  if (typeof order.details === 'object') {
    return order.details as WorkDetails;
  }

  try {
    return JSON.parse(order.details) as WorkDetails;
  } catch {
    return {};
  }
}

function parsePayload(event: WorkEvent): Record<string, unknown> {
  if (!event.payload) return {};

  if (typeof event.payload === 'object') {
    return event.payload;
  }

  try {
    return JSON.parse(event.payload) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function getPosition(): Promise<PositionPayload> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve({});

    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        location_accuracy: Math.round(position.coords.accuracy),
      }),
      () => resolve({}),
      { enableHighAccuracy: true, timeout: 7000, maximumAge: 30000 }
    );
  });
}

function mapsUrl(event?: WorkEvent) {
  if (!event?.latitude || !event?.longitude) return null;
  return `https://www.google.com/maps?q=${event.latitude},${event.longitude}`;
}

function minutesBetween(start?: string, stop?: string) {
  if (!start || !stop) return null;

  const startTime = new Date(start).getTime();
  const stopTime = new Date(stop).getTime();

  if (Number.isNaN(startTime) || Number.isNaN(stopTime) || stopTime < startTime) return null;
  return Math.round((stopTime - startTime) / 60000);
}

function durationLabel(minutes: number | null, t: Translator) {
  if (minutes === null) return '—';
  if (minutes < 60) return t('minutesShort', { count: minutes });

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? t('hoursMinutesShort', { hours, minutes: rest }) : t('hoursShort', { hours });
}

function eventLabel(type: string, t: Translator) {
  return t(actionLabelKeys[type] || type);
}

export default function DemoPage() {
  const { locale, t } = useI18n();
  const [orders, setOrders] = useState<DemoWorkOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [fieldState, setFieldState] = useState<FieldState | null>(null);
  const [events, setEvents] = useState<WorkEvent[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [date, setDate] = useState(today());
  const [leistungsart, setLeistungsart] = useState('WTU');
  const [leistungsartCustom, setLeistungsartCustom] = useState('');
  const [referenznummer, setReferenznummer] = useState('');
  const [zugnummer, setZugnummer] = useState('');
  const [einsatzort, setEinsatzort] = useState('');
  const [plannedStart, setPlannedStart] = useState('');
  const [plannedStop, setPlannedStop] = useState('');
  const [isNight, setIsNight] = useState(false);
  const [isSunday, setIsSunday] = useState(false);
  const [isHoliday, setIsHoliday] = useState(false);
  const [bemerkung, setBemerkung] = useState('');
  const [message, setMessage] = useState(t('loadingAssignments'));
  const [geoMessage, setGeoMessage] = useState(t('geoWillAsk'));
  const [saving, setSaving] = useState(false);
  const [employeeId, setEmployeeId] = useState<number | null>(null);

  useEffect(() => {
    setGeoMessage(t('geoWillAsk'));
  }, [t]);

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) || null,
    [orders, selectedOrderId]
  );
  const selectedDetails = useMemo(() => parseDetails(selectedOrder), [selectedOrder]);

  const currentAction = fieldState?.allowed_actions?.[0] || 'gasfahrt_start';
  const currentLabel = eventLabel(currentAction, t) || fieldState?.next_button || 'Gasfahrt';
  const currentStateLabel = t(stateLabelKeys[fieldState?.current_state || 'idle'] || fieldState?.current_state || 'stateIdle');
  const realLeistungsart = leistungsart === '' ? leistungsartCustom.trim() : leistungsart;
  const plannedExceeded = Boolean(fieldState?.planned_exceeded);
  const stopBlocked = currentAction === 'arbeit_stop' && Boolean(fieldState?.requires_bemerkung) && bemerkung.trim() === '';
  const dienstbeginnBlocked = currentAction === 'dienstbeginn' && (!selectedOrderId || !date || !realLeistungsart || !referenznummer.trim() || !zugnummer.trim() || !einsatzort.trim());
  const disabled = saving || !employeeId || stopBlocked || dienstbeginnBlocked || !selectedOrderId;

  const groupedOrders = useMemo(() => {
    return orders.reduce<Record<string, DemoWorkOrder[]>>((groups, order) => {
      const details = parseDetails(order);
      const customer = details.customer_name || t('customerNotSelected');
      groups[customer] = groups[customer] || [];
      groups[customer].push(order);
      return groups;
    }, {});
  }, [orders, t]);

  const completedOrderIds = useMemo(() => {
    return new Set(events
      .filter((event) => event.event_type === 'arbeit_stop' && event.assignment_id)
      .map((event) => Number(event.assignment_id)));
  }, [events]);

  const latestLocatedEvent = useMemo(() => events.find((event) => event.latitude && event.longitude), [events]);
  const latestMapUrl = mapsUrl(latestLocatedEvent);

  const selectedWorkDuration = useMemo(() => {
    if (!selectedOrderId) return null;

    const chronological = [...events].reverse();
    let start: string | undefined;

    for (const event of chronological) {
      if (Number(event.assignment_id) !== selectedOrderId) continue;
      if (event.event_type === 'dienstbeginn') start = event.event_time;
      if (event.event_type === 'arbeit_stop' && start) return minutesBetween(start, event.event_time);
    }

    return null;
  }, [events, selectedOrderId]);

  function addLog(text: string) {
    setLog((items) => [`${timeNow(locale)} — ${text}`, ...items].slice(0, 12));
  }

  async function refreshState(orderId = selectedOrderId, profileId = employeeId) {
    if (!profileId) {
      setFieldState(null);
      return null;
    }

    try {
      const state = await getFieldState(profileId, orderId || undefined);
      setFieldState(state);
      return state;
    } catch {
      setFieldState(null);
      setMessage(t('backendUnavailable'));
      return null;
    }
  }

  async function refreshEvents(profileId = employeeId) {
    if (!profileId) {
      setEvents([]);
      return;
    }

    try {
      const response = await getWorkEvents({ employeeId: profileId });
      setEvents(response.data);
    } catch {
      setEvents([]);
    }
  }

  function applyOrder(order: DemoWorkOrder, profileId = employeeId) {
    const details = parseDetails(order);
    setSelectedOrderId(order.id);
    setReferenznummer(order.reference_number || '');
    setLeistungsart(details.leistungsart || 'WTU');
    setLeistungsartCustom('');
    setZugnummer(details.zugnummer || '');
    setEinsatzort(details.einsatzort || '');
    setPlannedStart(order.planned_start_at ? order.planned_start_at.slice(11, 16) : '');
    setPlannedStop(order.planned_end_at ? order.planned_end_at.slice(11, 16) : '');
    setBemerkung('');
    if (profileId) refreshState(order.id, profileId);
  }

  async function loadWorkday() {
    setSaving(true);
    setMessage(t('loadingAssignments'));

    try {
      const current = await me();
      const profileId = current.data.employee_profile_id ? Number(current.data.employee_profile_id) : null;

      setEmployeeId(profileId);

      if (!profileId) {
        setOrders([]);
        setSelectedOrderId(null);
        setFieldState(null);
        setEvents([]);
        setMessage('К пользователю не привязан профиль сотрудника. Сначала создайте сотрудника в справочнике и привяжите его к пользователю.');
        return;
      }

      const response = await getWorkOrders({ employeeId: profileId });
      setOrders(response.data);

      const first = response.data[0];

      if (first) {
        applyOrder(first, profileId);
      } else {
        setSelectedOrderId(null);
        setFieldState(null);
        setMessage('Для этого сотрудника пока нет назначенных заданий.');
      }

      await refreshEvents(profileId);
    } catch (error) {
      const errorText = error instanceof Error ? error.message : t('unknownError');
      setOrders([]);
      setSelectedOrderId(null);
      setFieldState(null);
      setEvents([]);
      setMessage(t('assignmentsFailed', { error: errorText }));
    } finally {
      setSaving(false);
    }
  }


  useEffect(() => {
    loadWorkday();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function next() {
    if (!employeeId) {
      setMessage('К пользователю не привязан профиль сотрудника.');
      return;
    }

    if (disabled) {
      setMessage(t('buttonBlocked'));
      return;
    }

    const route = routeByAction[currentAction];

    if (!route) {
      setMessage(t('routeMissing'));
      return;
    }

    setSaving(true);
    setMessage(t('sending', { action: currentLabel }));
    addLog(t('logSending', { action: currentLabel }));

    const position = await getPosition();

    if (position.latitude && position.longitude) {
      setGeoMessage(t('coordinatesReady', {
        lat: position.latitude.toFixed(5),
        lng: position.longitude.toFixed(5),
        accuracy: position.location_accuracy || '?',
      }));
    } else {
      setGeoMessage(t('coordinatesDenied'));
    }

    try {
      await postWorkEvent(route, {
        employee_id: employeeId,
        assignment_id: selectedOrderId || undefined,
        ...position,
        planned_exceeded: plannedExceeded,
        bemerkung,
        payload: {
          source: 'field-crm-screen',
          action_label: fieldState?.next_button || currentLabel,
          date,
          object_name: selectedDetails.object_name,
          object_address: selectedDetails.object_address,
          customer_name: selectedDetails.customer_name,
          work_title: selectedDetails.work_title || selectedOrder?.title,
          leistungsart: realLeistungsart,
          referenznummer,
          zugnummer,
          einsatzort,
          planned_start: plannedStart,
          planned_stop: plannedStop,
          is_night: isNight,
          is_sunday: isSunday,
          is_holiday: isHoliday,
          bemerkung,
          client_time: timeNow(locale),
        },
      });

      addLog(t('logSaved', { action: currentLabel }));
      setMessage(t('saved', { action: currentLabel }));
      await refreshEvents();
      await refreshState();
    } catch (error) {
      const errorText = error instanceof Error ? error.message : t('unknownError');
      addLog(t('logFailed', { action: currentLabel, error: errorText }));
      setMessage(t('backendRejected', { error: errorText }));
      await refreshState();
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="page-shell field-crm-page">
      <section className="hero-card field-hero">
        <div>
          <p className="eyebrow">{t('fieldEyebrow')}</p>
          <h1>{t('fieldTitle')}</h1>
          <p className="hero-text">{t('fieldHeroText')}</p>
        </div>
        <div className="field-status-stack">
          <div className="status-pill">{currentStateLabel}</div>
          <span>{selectedDetails.object_name || t('objectLoading')}</span>
        </div>
      </section>

      <section className="field-layout">
        <aside className="panel field-sidebar">
          <div className="field-panel-head">
            <p className="eyebrow">{t('object')}</p>
            <h2>{selectedDetails.object_name || 'Berlin Hauptbahnhof'}</h2>
            <p className="hint">{selectedDetails.object_address || 'Europaplatz 1, 10557 Berlin'}</p>
          </div>

          {Object.entries(groupedOrders).map(([customer, customerOrders]) => (
            <div className="customer-block" key={customer}>
              <h3>{customer}</h3>
              <div className="work-list">
                {customerOrders.map((order) => {
                  const details = parseDetails(order);
                  const active = order.id === selectedOrderId;
                  const done = completedOrderIds.has(order.id);

                  return (
                    <button className={`work-card ${active ? 'active' : ''}`} key={order.id} onClick={() => applyOrder(order)} type="button">
                      <span className="work-card-title">{details.work_title || order.title}</span>
                      <span>{order.reference_number}</span>
                      <small>{details.leistungsart || '—'} · {details.zugnummer || '—'} · {details.einsatzort || '—'}</small>
                      <strong className={done ? 'done-badge' : 'planned-badge'}>{done ? t('done') : order.status || 'planned'}</strong>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </aside>

        <section className="field-main">
          <div className="panel action-panel field-action-panel">
            <div>
              <p className="eyebrow">{t('nextAction')}</p>
              <h2>{currentLabel}</h2>
              <p className="hint">Backend action: {currentAction}</p>
            </div>

            <button className="action-button primary giant-action" onClick={next} type="button" disabled={disabled}>
              {saving ? t('saving') : currentLabel}
            </button>

            <div className="field-alerts">
              <p className="hint">{message}</p>
              <p className="hint">{geoMessage}</p>
              {stopBlocked ? <p className="hint danger-text"><strong>{t('stopBlockedTitle')}</strong> {t('stopBlockedText')}</p> : null}
              {dienstbeginnBlocked ? <p className="hint danger-text"><strong>{t('dienstbeginnBlockedTitle')}</strong> {t('dienstbeginnBlockedText')}</p> : null}
            </div>
          </div>

          <div className="panel">
            <div className="field-panel-head split-head">
              <div>
                <p className="eyebrow">{t('selectedWork')}</p>
                <h2>{selectedDetails.work_title || selectedOrder?.title || t('workNotSelected')}</h2>
                <p className="hint">{selectedDetails.customer_name || t('customerNotSelected')}</p>
              </div>
              <div className="metric-card compact">
                <span>{t('workFact')}</span>
                <strong>{durationLabel(selectedWorkDuration, t)}</strong>
              </div>
            </div>

            <div className="form-grid">
              <label>{t('date')}<input value={date} onChange={(event) => setDate(event.target.value)} type="date" /></label>
              <label>{t('workType')}<select value={leistungsart} onChange={(event) => setLeistungsart(event.target.value)}>{leistungsartOptions.map((item) => <option key={item || 'custom'} value={item}>{item === '' ? t('customWorkTypeOption') : item}</option>)}</select></label>
              {leistungsart === '' ? <label>{t('customWorkType')}<input value={leistungsartCustom} onChange={(event) => setLeistungsartCustom(event.target.value)} placeholder={t('customWorkTypePlaceholder')} /></label> : null}
              <label>Referenznummer<input value={referenznummer} onChange={(event) => setReferenznummer(event.target.value)} /></label>
              <label>Zugnummer<input value={zugnummer} onChange={(event) => setZugnummer(event.target.value)} /></label>
              <label>Einsatzort<input value={einsatzort} onChange={(event) => setEinsatzort(event.target.value)} /></label>
              <label>{t('plannedStart')}<input value={plannedStart} onChange={(event) => setPlannedStart(event.target.value)} type="time" /></label>
              <label>{t('plannedStop')}<input value={plannedStop} onChange={(event) => setPlannedStop(event.target.value)} type="time" /></label>
              <label><input checked={isNight} onChange={(event) => setIsNight(event.target.checked)} type="checkbox" /> {t('nightWork')}</label>
              <label><input checked={isSunday} onChange={(event) => setIsSunday(event.target.checked)} type="checkbox" /> {t('sunday')}</label>
              <label><input checked={isHoliday} onChange={(event) => setIsHoliday(event.target.checked)} type="checkbox" /> {t('holiday')}</label>
              <label className="wide-field">{t('bemerkung')}<textarea value={bemerkung} onChange={(event) => setBemerkung(event.target.value)} placeholder={t('bemerkungPlaceholder')} /></label>
            </div>
          </div>

          <section className="grid lower-grid field-lower-grid">
            <div className="panel">
              <h2>{t('actionLog')}</h2>
              {log.length === 0 ? <p className="hint">{t('noActions')}</p> : null}
              {log.map((item, index) => <p className="log-line" key={`${item}-${index}`}>{item}</p>)}
            </div>

            <div className="panel">
              <h2>{t('googleMapsPosition')}</h2>
              <div className="map-box">
                {latestMapUrl ? <a className="action-link" href={latestMapUrl} target="_blank" rel="noreferrer">{t('openLastPoint')}</a> : <span>{t('coordinatesAfterAllow')}</span>}
              </div>
              <p className="hint">{t('lastGpsEvent', { event: latestLocatedEvent ? `${eventLabel(latestLocatedEvent.event_type, t)} · ${formatDateTime(latestLocatedEvent.event_time, locale)}` : t('noGpsEvent') })}</p>
            </div>
          </section>

          <div className="panel">
            <h2>{t('workdayTimeline')}</h2>
            <div className="timeline">
              {events.length === 0 ? <p className="hint">{t('noEvents')}</p> : null}
              {events.map((event) => {
                const payload = parsePayload(event);
                return (
                  <div className="timeline-item done" key={event.id}>
                    <strong>{formatDateTime(event.event_time, locale)}</strong>
                    <div>
                      <p>{eventLabel(event.event_type, t)}</p>
                      <span>{String(payload.customer_name || '')} {payload.work_title ? `— ${String(payload.work_title)}` : ''}</span>
                      {event.latitude && event.longitude ? <span> · GPS: {event.latitude}, {event.longitude}</span> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
