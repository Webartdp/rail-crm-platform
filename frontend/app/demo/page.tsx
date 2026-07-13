'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  getWorkEvents,
  postWorkEvent,
  resetDemoWorkEvents,
  seedFieldDemo,
  type DemoWorkOrder,
  type WorkEvent,
  workEventRoutes,
} from '../../lib/api';
import { getFieldState, type FieldState } from '../../lib/field-state';

const employeeId = 1;
const leistungsartOptions = ['', 'WTU', 'WSU', 'E-WU', 'Rb', 'Azf', 'RID-Kontrolle', 'Zugbeschtreifung'];

const routeByAction: Record<string, string> = {
  gasfahrt_start: workEventRoutes.gasfahrtStart,
  gasfahrt_stop: workEventRoutes.gasfahrtStop,
  dienstbeginn: workEventRoutes.dienstbeginn,
  arbeit_stop: workEventRoutes.arbeitStop,
  dienstfahrt_start: workEventRoutes.dienstfahrtStart,
  dienstfahrt_stop: workEventRoutes.dienstfahrtStop,
};

const actionLabels: Record<string, string> = {
  gasfahrt_start: 'Gasfahrt — выезд из дома',
  gasfahrt_stop: 'Gasfahrt beendet — прибыл на объект',
  dienstbeginn: 'Dienstbeginn — начало работы',
  arbeit_stop: 'Stop — окончание работы',
  dienstfahrt_start: 'Start Dienstfahrt — выезд на следующее место',
  dienstfahrt_stop: 'Stop Dienstfahrt — прибыл на следующее место',
};

const stateLabels: Record<string, string> = {
  idle: 'Готов к выезду',
  gasfahrt_active: 'В дороге на работу',
  arrived: 'Прибыл на объект',
  work_active: 'Работа выполняется',
  work_finished: 'Работа завершена',
  dienstfahrt_active: 'Служебный переезд',
  dienstfahrt_finished: 'Прибыл на следующее место',
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

function today() {
  return new Date().toISOString().slice(0, 10);
}

function timeNow() {
  return new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(new Date());
}

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat('ru-RU', {
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

function durationLabel(minutes: number | null) {
  if (minutes === null) return '—';
  if (minutes < 60) return `${minutes} мин`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} ч ${rest} мин` : `${hours} ч`;
}

function eventLabel(type: string) {
  return actionLabels[type] || type;
}

export default function DemoPage() {
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
  const [message, setMessage] = useState('Загружаю рабочие задания...');
  const [geoMessage, setGeoMessage] = useState('Геопозиция будет запрошена при нажатии рабочей кнопки.');
  const [saving, setSaving] = useState(false);

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) || null,
    [orders, selectedOrderId]
  );
  const selectedDetails = useMemo(() => parseDetails(selectedOrder), [selectedOrder]);

  const currentAction = fieldState?.allowed_actions?.[0] || 'gasfahrt_start';
  const currentLabel = actionLabels[currentAction] || fieldState?.next_button || 'Gasfahrt';
  const currentStateLabel = stateLabels[fieldState?.current_state || 'idle'] || fieldState?.current_state || '—';
  const realLeistungsart = leistungsart === '' ? leistungsartCustom.trim() : leistungsart;
  const plannedExceeded = Boolean(fieldState?.planned_exceeded);
  const stopBlocked = currentAction === 'arbeit_stop' && Boolean(fieldState?.requires_bemerkung) && bemerkung.trim() === '';
  const dienstbeginnBlocked = currentAction === 'dienstbeginn' && (!selectedOrderId || !date || !realLeistungsart || !referenznummer.trim() || !zugnummer.trim() || !einsatzort.trim());
  const disabled = saving || stopBlocked || dienstbeginnBlocked || !selectedOrderId;

  const groupedOrders = useMemo(() => {
    return orders.reduce<Record<string, DemoWorkOrder[]>>((groups, order) => {
      const details = parseDetails(order);
      const customer = details.customer_name || 'Без заказчика';
      groups[customer] = groups[customer] || [];
      groups[customer].push(order);
      return groups;
    }, {});
  }, [orders]);

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
    setLog((items) => [`${timeNow()} — ${text}`, ...items].slice(0, 12));
  }

  async function refreshState(orderId = selectedOrderId) {
    try {
      const state = await getFieldState(employeeId, orderId || undefined);
      setFieldState(state);
      return state;
    } catch {
      setFieldState(null);
      setMessage('Не могу получить состояние сотрудника. Проверь backend на http://localhost:8000.');
      return null;
    }
  }

  async function refreshEvents() {
    try {
      const response = await getWorkEvents({ employeeId });
      setEvents(response.data);
    } catch {
      setEvents([]);
    }
  }

  function applyOrder(order: DemoWorkOrder) {
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
    refreshState(order.id);
  }

  async function loadDemo() {
    setSaving(true);
    setMessage('Готовлю объект, заказчиков и работы...');

    try {
      const seeded = await seedFieldDemo(employeeId);
      setOrders(seeded.orders);

      const first = seeded.orders[0];
      if (first) applyOrder(first);

      await refreshEvents();
      setMessage('Рабочие задания загружены. Выбери работу и нажми рабочую кнопку.');
    } catch (error) {
      const errorText = error instanceof Error ? error.message : 'неизвестная ошибка';
      setMessage(`Не удалось подготовить задания: ${errorText}`);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadDemo();
  }, []);

  async function next() {
    if (disabled) {
      setMessage('Кнопка заблокирована: проверь выбранную работу, обязательные поля или Bemerkung.');
      return;
    }

    const route = routeByAction[currentAction];

    if (!route) {
      setMessage('Не найдена API route для следующего действия.');
      return;
    }

    setSaving(true);
    setMessage(`Отправляю: ${currentLabel}...`);
    addLog(`отправка: ${currentLabel}`);

    const position = await getPosition();

    if (position.latitude && position.longitude) {
      setGeoMessage(`Координаты получены: ${position.latitude.toFixed(5)}, ${position.longitude.toFixed(5)} ±${position.location_accuracy || '?'} м`);
    } else {
      setGeoMessage('Браузер не дал координаты. Событие сохранится без точки на карте.');
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
          client_time: timeNow(),
        },
      });

      addLog(`${currentLabel} сохранено в API`);
      setMessage(`${currentLabel} сохранено.`);
      await refreshEvents();
      await refreshState();
    } catch (error) {
      const errorText = error instanceof Error ? error.message : 'неизвестная ошибка';
      addLog(`${currentLabel} не сохранено: ${errorText}`);
      setMessage(`Backend не принял действие: ${errorText}`);
      await refreshState();
    } finally {
      setSaving(false);
    }
  }

  async function resetWorkflow() {
    setSaving(true);
    setMessage('Сбрасываю рабочий день...');

    try {
      const result = await resetDemoWorkEvents(employeeId);
      setLog([]);
      addLog(`рабочий день сброшен, удалено событий: ${result.deleted}`);
      await refreshEvents();
      await refreshState();
      setMessage('Рабочий день сброшен. Можно начинать с Gasfahrt.');
    } catch (error) {
      const errorText = error instanceof Error ? error.message : 'неизвестная ошибка';
      addLog(`сброс не выполнен: ${errorText}`);
      setMessage(`Не удалось сбросить workflow: ${errorText}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="page-shell field-crm-page">
      <section className="hero-card field-hero">
        <div>
          <p className="eyebrow">Field CRM / русский dev-режим</p>
          <h1>Рабочий день сотрудника</h1>
          <p className="hero-text">Gasfahrt → Gasfahrt beendet → Dienstbeginn → Stop → Dienstfahrt. Один объект может иметь несколько заказчиков и несколько работ.</p>
        </div>
        <div className="field-status-stack">
          <div className="status-pill">{currentStateLabel}</div>
          <span>{selectedDetails.object_name || 'Объект загружается'}</span>
        </div>
      </section>

      <section className="field-layout">
        <aside className="panel field-sidebar">
          <div className="field-panel-head">
            <p className="eyebrow">Объект</p>
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
                      <strong className={done ? 'done-badge' : 'planned-badge'}>{done ? 'выполнено' : order.status || 'planned'}</strong>
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
              <p className="eyebrow">Следующее действие</p>
              <h2>{currentLabel}</h2>
              <p className="hint">Backend action: {currentAction}</p>
            </div>

            <button className="action-button primary giant-action" onClick={next} type="button" disabled={disabled}>
              {saving ? 'Сохраняю...' : currentLabel}
            </button>
            <button className="action-button secondary" onClick={resetWorkflow} type="button" disabled={saving}>Сбросить рабочий день</button>

            <div className="field-alerts">
              <p className="hint">{message}</p>
              <p className="hint">{geoMessage}</p>
              {stopBlocked ? <p className="hint danger-text"><strong>Stop заблокирован:</strong> плановое время превышено, заполни Bemerkung.</p> : null}
              {dienstbeginnBlocked ? <p className="hint danger-text"><strong>Dienstbeginn заблокирован:</strong> дата, Leistungsart, Referenznummer, Zugnummer и Einsatzort обязательны.</p> : null}
            </div>
          </div>

          <div className="panel">
            <div className="field-panel-head split-head">
              <div>
                <p className="eyebrow">Выбранная работа</p>
                <h2>{selectedDetails.work_title || selectedOrder?.title || 'Работа не выбрана'}</h2>
                <p className="hint">{selectedDetails.customer_name || 'Заказчик не выбран'}</p>
              </div>
              <div className="metric-card compact">
                <span>Факт по работе</span>
                <strong>{durationLabel(selectedWorkDuration)}</strong>
              </div>
            </div>

            <div className="form-grid">
              <label>Дата<input value={date} onChange={(event) => setDate(event.target.value)} type="date" /></label>
              <label>Тип работы / Leistungsart<select value={leistungsart} onChange={(event) => setLeistungsart(event.target.value)}>{leistungsartOptions.map((item) => <option key={item || 'custom'} value={item}>{item === '' ? 'Пустая строка — внести вручную' : item}</option>)}</select></label>
              {leistungsart === '' ? <label>Своя Leistungsart<input value={leistungsartCustom} onChange={(event) => setLeistungsartCustom(event.target.value)} placeholder="Например Sonderkontrolle" /></label> : null}
              <label>Referenznummer<input value={referenznummer} onChange={(event) => setReferenznummer(event.target.value)} /></label>
              <label>Zugnummer<input value={zugnummer} onChange={(event) => setZugnummer(event.target.value)} /></label>
              <label>Einsatzort<input value={einsatzort} onChange={(event) => setEinsatzort(event.target.value)} /></label>
              <label>Плановый Start<input value={plannedStart} onChange={(event) => setPlannedStart(event.target.value)} type="time" /></label>
              <label>Плановый Stop<input value={plannedStop} onChange={(event) => setPlannedStop(event.target.value)} type="time" /></label>
              <label><input checked={isNight} onChange={(event) => setIsNight(event.target.checked)} type="checkbox" /> Nacht / ночная работа</label>
              <label><input checked={isSunday} onChange={(event) => setIsSunday(event.target.checked)} type="checkbox" /> Sonntag / воскресенье</label>
              <label><input checked={isHoliday} onChange={(event) => setIsHoliday(event.target.checked)} type="checkbox" /> Feiertag / праздник</label>
              <label className="wide-field">Bemerkung<textarea value={bemerkung} onChange={(event) => setBemerkung(event.target.value)} placeholder="Описание особенностей, обязательно при превышении планового времени" /></label>
            </div>
          </div>

          <section className="grid lower-grid field-lower-grid">
            <div className="panel">
              <h2>Лог действий</h2>
              {log.length === 0 ? <p className="hint">Пока действий нет.</p> : null}
              {log.map((item, index) => <p className="log-line" key={`${item}-${index}`}>{item}</p>)}
            </div>

            <div className="panel">
              <h2>Google Maps позиция</h2>
              <div className="map-box">
                {latestMapUrl ? <a className="action-link" href={latestMapUrl} target="_blank" rel="noreferrer">Открыть последнюю точку на Google Maps</a> : <span>Координаты появятся после разрешения геолокации</span>}
              </div>
              <p className="hint">Последнее событие с координатами: {latestLocatedEvent ? `${eventLabel(latestLocatedEvent.event_type)} · ${formatDateTime(latestLocatedEvent.event_time)}` : 'нет'}</p>
            </div>
          </section>

          <div className="panel">
            <h2>Лента событий рабочего дня</h2>
            <div className="timeline">
              {events.length === 0 ? <p className="hint">Событий пока нет.</p> : null}
              {events.map((event) => {
                const payload = parsePayload(event);
                return (
                  <div className="timeline-item done" key={event.id}>
                    <strong>{formatDateTime(event.event_time)}</strong>
                    <div>
                      <p>{eventLabel(event.event_type)}</p>
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
