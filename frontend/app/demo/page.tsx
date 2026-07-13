'use client';

import { useEffect, useState } from 'react';
import { postWorkEvent, resetDemoWorkEvents, workEventRoutes } from '../../lib/api';
import { getFieldState, type FieldState } from '../../lib/field-state';

const fallbackEmployeeId = 1;
const fallbackOrderId = 1;

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
      (position) => resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        location_accuracy: Math.round(position.coords.accuracy),
      }),
      () => resolve({}),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 30000 }
    );
  });
}

export default function DemoPage() {
  const [employeeId] = useState(fallbackEmployeeId);
  const [selectedOrderId] = useState(fallbackOrderId);
  const [fieldState, setFieldState] = useState<FieldState | null>(null);
  const [log, setLog] = useState<string[]>([]);
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
  const [message, setMessage] = useState('Готово. Нажми рабочую кнопку.');
  const [saving, setSaving] = useState(false);
  const [geoMessage, setGeoMessage] = useState('Геопозиция будет запрошена при нажатии рабочей кнопки.');

  function addLog(text: string) {
    setLog((items) => [...items, `${timeNow()} — ${text}`]);
  }

  async function refreshState() {
    try {
      const state = await getFieldState(employeeId, selectedOrderId);
      setFieldState(state);
      return state;
    } catch (error) {
      setFieldState(null);
      setMessage('Не могу получить состояние сотрудника. Проверь, что backend запущен на http://localhost:8000.');
      return null;
    }
  }

  useEffect(() => {
    refreshState();
  }, []);

  const currentAction = fieldState?.allowed_actions?.[0] || 'gasfahrt_start';
  const backendButtonLabel = fieldState?.next_button || 'Gasfahrt';
  const currentLabel = actionLabels[currentAction] || backendButtonLabel;
  const realLeistungsart = leistungsart === '' ? leistungsartCustom.trim() : leistungsart;
  const plannedExceeded = Boolean(fieldState?.planned_exceeded);
  const stopBlocked = Boolean(fieldState?.requires_bemerkung) && bemerkung.trim() === '';
  const dienstbeginnBlocked = currentAction === 'dienstbeginn' && (!date || !realLeistungsart || !referenznummer.trim() || !zugnummer.trim() || !einsatzort.trim());
  const disabled = saving || stopBlocked || dienstbeginnBlocked;

  async function next() {
    if (disabled) {
      setMessage('Кнопка заблокирована: проверь обязательные поля или комментарий / Bemerkung.');
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
        assignment_id: selectedOrderId,
        ...position,
        planned_exceeded: plannedExceeded,
        bemerkung,
        payload: {
          source: 'stable-demo',
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
          bemerkung,
          client_time: timeNow(),
        },
      });

      addLog(`${currentLabel} сохранено в API`);
      setMessage(`${currentLabel} сохранено.`);
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
    setMessage('Сбрасываю demo workflow...');

    try {
      const result = await resetDemoWorkEvents(employeeId);
      setLog([]);
      addLog(`demo workflow сброшен, удалено событий: ${result.deleted}`);
      setMessage('Demo workflow сброшен. Можно начинать с Gasfahrt.');
      await refreshState();
    } catch (error) {
      const errorText = error instanceof Error ? error.message : 'неизвестная ошибка';
      addLog(`сброс не выполнен: ${errorText}`);
      setMessage(`Не удалось сбросить workflow: ${errorText}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Рабочий экран сотрудника</p>
          <h1>Workflow кнопок</h1>
          <p className="hero-text">Стабильная проверка цепочки: Gasfahrt → Gasfahrt beendet → Dienstbeginn → Stop → Dienstfahrt.</p>
          <p className="hint">Сотрудник #{employeeId}, тестовое задание #{selectedOrderId}</p>
        </div>
        <div className="status-pill">{fieldState?.current_state || 'загрузка'}</div>
      </section>

      <section className="grid">
        <div className="panel action-panel">
          <button className="action-button primary" onClick={next} type="button" disabled={disabled}>
            {saving ? 'Сохраняю...' : currentLabel}
          </button>
          <button className="action-button secondary" onClick={resetWorkflow} type="button" disabled={saving}>
            Сбросить demo workflow
          </button>
          <p className="hint">Следующее backend-действие: {currentAction}</p>
          <p className="hint">Последнее событие: {fieldState?.last_event_type || 'нет'}</p>
          <p className="hint">Плановое завершение: {fieldState?.planned_end_at || plannedStop}</p>
          <p className="hint">{message}</p>
          <p className="hint">{geoMessage}</p>
          {stopBlocked ? <p className="hint"><strong>Нужен комментарий / Bemerkung:</strong> плановое время превышено.</p> : null}
          {dienstbeginnBlocked ? <p className="hint"><strong>Заполни поля:</strong> дата, тип услуги, референс, номер поезда и место работы.</p> : null}
        </div>

        <div className="panel">
          <h2>Данные задания</h2>
          <div className="form-grid">
            <label>Задание<input value="REF-2026-001 — WTU / ICE 204 / Gleis 12" readOnly /></label>
            <label>Дата<input value={date} onChange={(event) => setDate(event.target.value)} type="date" /></label>
            <label>Тип услуги / Leistungsart<select value={leistungsart} onChange={(event) => setLeistungsart(event.target.value)}>{leistungsartOptions.map((item) => <option key={item || 'custom'} value={item}>{item === '' ? 'Своя услуга' : item}</option>)}</select></label>
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
