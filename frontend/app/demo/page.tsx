'use client';

import { useEffect, useState } from 'react';
import { me, type AuthUser } from '../../lib/auth';
import { postWorkEvent, workEventRoutes } from '../../lib/api';
import { getFieldState, type FieldState } from '../../lib/field-state';
import { getWorkOrders, type WorkOrder } from '../../lib/work-orders';

const fallbackEmployeeId = 1;
const leistungsartOptions = ['', 'WTU', 'WSU', 'E-WU', 'Rb', 'Azf', 'RID-Kontrolle', 'Zugbeschtreifung'];
const fallbackOrders = [
  { id: 1, employee_id: fallbackEmployeeId, title: 'WTU / ICE 204 / Gleis 12', reference_number: 'REF-2026-001', status: 'planned' },
];
const routeByAction: Record<string, string> = {
  gasfahrt_start: workEventRoutes.gasfahrtStart,
  gasfahrt_stop: workEventRoutes.gasfahrtStop,
  dienstbeginn: workEventRoutes.dienstbeginn,
  arbeit_stop: workEventRoutes.arbeitStop,
  dienstfahrt_start: workEventRoutes.dienstfahrtStart,
  dienstfahrt_stop: workEventRoutes.dienstfahrtStop,
};

const actionLabels: Record<string, string> = {
  gasfahrt_start: 'Начать дорогу из дома / Gasfahrt',
  gasfahrt_stop: 'Завершить дорогу / Gasfahrt beendet',
  dienstbeginn: 'Начать работу / Dienstbeginn',
  arbeit_stop: 'Завершить работу / Stop',
  dienstfahrt_start: 'Начать служебный переезд / Start Dienstfahrt',
  dienstfahrt_stop: 'Завершить служебный переезд / Stop Dienstfahrt',
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function timeNow() {
  return new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(new Date());
}

function getPosition(): Promise<{ latitude?: number; longitude?: number; location_accuracy?: number }> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve({});
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude, location_accuracy: Math.round(position.coords.accuracy) }),
      () => resolve({}),
      { enableHighAccuracy: true, timeout: 5000 }
    );
  });
}

function applyOrderTitle(title: string) {
  const parts = title.split('/').map((part) => part.trim());
  return { leistungsart: parts[0] || 'WTU', zugnummer: parts[1] || '', einsatzort: parts[2] || '' };
}

export default function DemoPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [employeeId, setEmployeeId] = useState(fallbackEmployeeId);
  const [log, setLog] = useState<string[]>([]);
  const [orders, setOrders] = useState<WorkOrder[]>(fallbackOrders);
  const [selectedOrderId, setSelectedOrderId] = useState(1);
  const [fieldState, setFieldState] = useState<FieldState | null>(null);
  const [date, setDate] = useState(today());
  const [leistungsart, setLeistungsart] = useState('WTU');
  const [leistungsartCustom, setLeistungsartCustom] = useState('');
  const [referenznummer, setReferenznummer] = useState('REF-2026-001');
  const [zugnummer, setZugnummer] = useState('ICE 204');
  const [einsatzort, setEinsatzort] = useState('Gleis 12');
  const [plannedStart, setPlannedStart] = useState('07:30');
  const [plannedStop, setPlannedStop] = useState('15:30');
  const [isNight, setIsNight] = useState(false);
  const [isSunday, setIsSunday] = useState(false);
  const [isHoliday, setIsHoliday] = useState(false);
  const [bemerkung, setBemerkung] = useState('');
  const [message, setMessage] = useState('Готово.');
  const [saving, setSaving] = useState(false);

  async function refreshState(orderId = selectedOrderId, nextEmployeeId = employeeId) {
    try {
      const state = await getFieldState(nextEmployeeId, orderId);
      setFieldState(state);
      return state;
    } catch (error) {
      setFieldState(null);
      setMessage('API состояния сотрудника недоступен. Проверь backend.');
      return null;
    }
  }

  async function loadForEmployee(nextEmployeeId: number) {
    try {
      const response = await getWorkOrders(nextEmployeeId);
      const nextOrders = response.data.length ? response.data : fallbackOrders;
      setOrders(nextOrders);
      setSelectedOrderId(nextOrders[0]?.id || 1);
      await refreshState(nextOrders[0]?.id || 1, nextEmployeeId);
    } catch (error) {
      setOrders(fallbackOrders);
      setMessage('API заданий недоступен. Включён тестовый fallback-заказ.');
      await refreshState(1, nextEmployeeId);
    }
  }

  useEffect(() => {
    me()
      .then((response) => {
        const nextUser = response.data;
        const nextEmployeeId = nextUser.employee_profile_id || fallbackEmployeeId;
        setUser(nextUser);
        setEmployeeId(nextEmployeeId);
        setMessage(`Вход выполнен: ${nextUser.name} (${nextUser.role}).`);
        loadForEmployee(nextEmployeeId);
      })
      .catch(() => loadForEmployee(fallbackEmployeeId));
  }, []);

  const currentAction = fieldState?.allowed_actions?.[0] || 'gasfahrt_start';
  const backendButtonLabel = fieldState?.next_button || 'Gasfahrt';
  const currentLabel = actionLabels[currentAction] || backendButtonLabel;
  const realLeistungsart = leistungsart === '' ? leistungsartCustom.trim() : leistungsart;
  const plannedExceeded = Boolean(fieldState?.planned_exceeded);
  const stopBlocked = Boolean(fieldState?.requires_bemerkung) && bemerkung.trim() === '';
  const dienstbeginnBlocked = backendButtonLabel === 'Dienstbeginn' && (!date || !realLeistungsart || !referenznummer.trim() || !zugnummer.trim() || !einsatzort.trim());
  const disabled = saving || stopBlocked || dienstbeginnBlocked;

  function selectOrder(id: number) {
    const order = orders.find((item) => item.id === id);
    if (!order) return;
    const parsed = applyOrderTitle(order.title || '');
    setSelectedOrderId(order.id);
    setReferenznummer(order.reference_number || '');
    setLeistungsart(parsed.leistungsart);
    setZugnummer(parsed.zugnummer);
    setEinsatzort(parsed.einsatzort);
    refreshState(order.id);
  }

  async function next() {
    if (stopBlocked) {
      setMessage('Stop заблокирован: плановое время превышено, комментарий / Bemerkung обязателен.');
      return;
    }

    if (dienstbeginnBlocked) {
      setMessage('Начало работы заблокировано: дата, тип услуги, референс, номер поезда и место работы обязательны.');
      return;
    }

    const route = routeByAction[currentAction];
    if (!route) {
      setMessage('Не найдена API route для следующего действия.');
      return;
    }

    setSaving(true);
    const position = await getPosition();

    try {
      await postWorkEvent(route, {
        employee_id: employeeId,
        assignment_id: selectedOrderId,
        ...position,
        planned_exceeded: plannedExceeded,
        bemerkung,
        payload: {
          source: 'demo',
          user_id: user?.id,
          action_label: backendButtonLabel,
          date,
          leistungsart: realLeistungsart,
          referenznummer,
          zugnummer,
          einsatzort,
          planned_start: plannedStart,
          planned_stop: plannedStop,
          is_night: isNight,
          is_sunday: isSunday,
          is_holiday: isHoliday,
          client_time: timeNow(),
        },
      });
      setLog((items) => [...items, `${timeNow()} — ${currentLabel} сохранено в API`]);
      setMessage(`${currentLabel} сохранено.`);
      await refreshState(selectedOrderId);
    } catch (error) {
      const state = await refreshState(selectedOrderId);
      setLog((items) => [...items, `${timeNow()} — ${currentLabel} не сохранено`]);
      setMessage(state ? `Действие отклонено. Следующее разрешённое действие: ${actionLabels[state.allowed_actions?.[0]] || state.next_button}.` : 'Действие не сохранено. API или состояние сотрудника недоступны.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Демо</p>
          <h1>Workflow кнопок сотрудника</h1>
          <p className="hero-text">Порядок действий по требованиям заказчика: Gasfahrt → Dienstbeginn → Stop → Dienstfahrt.</p>
          <p className="hint">Профиль сотрудника: #{employeeId}{user ? ` / ${user.name}` : ' / fallback'}</p>
        </div>
        <div className="status-pill">{fieldState?.current_state || 'загрузка'}</div>
      </section>

      <section className="grid">
        <div className="panel action-panel">
          <button className="action-button primary" onClick={next} type="button" disabled={disabled}>{saving ? 'Сохраняем...' : currentLabel}</button>
          <p className="hint">Разрешённое действие backend: {currentAction}</p>
          <p className="hint">Последнее событие: {fieldState?.last_event_type || 'нет'}</p>
          <p className="hint">Плановое завершение: {fieldState?.planned_end_at || plannedStop}</p>
          <p className="hint">{message}</p>
          {backendButtonLabel === 'Stop' ? <p className="hint">Backend считает план превышенным: {plannedExceeded ? 'да' : 'нет'}.</p> : null}
        </div>

        <div className="panel">
          <h2>Данные задания</h2>
          <div className="form-grid">
            <label>Задание<select value={selectedOrderId} onChange={(event) => selectOrder(Number(event.target.value))}>{orders.map((order) => <option key={order.id} value={order.id}>{order.reference_number || `#${order.id}`} — {order.title}</option>)}</select></label>
            <label>Дата<input value={date} onChange={(event) => setDate(event.target.value)} type="date" /></label>
            <label>Тип услуги / Leistungsart<select value={leistungsart} onChange={(event) => setLeistungsart(event.target.value)}>{leistungsartOptions.map((item) => <option key={item} value={item}>{item === '' ? 'Своя услуга' : item}</option>)}</select></label>
            {leistungsart === '' ? <label>Своя услуга<input value={leistungsartCustom} onChange={(event) => setLeistungsartCustom(event.target.value)} placeholder="Введите тип услуги" /></label> : null}
            <label>Референс / Referenznummer<input value={referenznummer} onChange={(event) => setReferenznummer(event.target.value)} /></label>
            <label>Номер поезда / Zugnummer<input value={zugnummer} onChange={(event) => setZugnummer(event.target.value)} /></label>
            <label>Место работы / Einsatzort<input value={einsatzort} onChange={(event) => setEinsatzort(event.target.value)} /></label>
            <label>Плановый старт<input value={plannedStart} onChange={(event) => setPlannedStart(event.target.value)} type="time" /></label>
            <label>Плановый стоп<input value={plannedStop} onChange={(event) => setPlannedStop(event.target.value)} type="time" /></label>
            <label><input checked={isNight} onChange={(event) => setIsNight(event.target.checked)} type="checkbox" /> Ночь / Nacht</label>
            <label><input checked={isSunday} onChange={(event) => setIsSunday(event.target.checked)} type="checkbox" /> Воскресенье / Sonntag</label>
            <label><input checked={isHoliday} onChange={(event) => setIsHoliday(event.target.checked)} type="checkbox" /> Праздник / Feiertag</label>
            <label className="wide-field">Комментарий / Bemerkung<textarea value={bemerkung} onChange={(event) => setBemerkung(event.target.value)} placeholder="Обязательно, если время превышено" /></label>
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>Лог действий</h2>
        {log.length === 0 ? <p className="hint">Пока действий нет.</p> : null}
        {log.map((item, index) => <p key={`${item}-${index}`}>{index + 1}. {item}</p>)}
      </section>
    </main>
  );
}
