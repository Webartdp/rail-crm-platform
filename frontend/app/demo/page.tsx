'use client';

import { useEffect, useState } from 'react';
import { postWorkEvent, workEventRoutes } from '../../lib/api';
import { getFieldState, type FieldState } from '../../lib/field-state';
import { getWorkOrders, type WorkOrder } from '../../lib/work-orders';

const employeeId = 1;
const leistungsartOptions = ['', 'WTU', 'WSU', 'E-WU', 'Rb', 'Azf', 'RID-Kontrolle', 'Zugbeschtreifung'];
const fallbackOrders = [
  { id: 1, employee_id: employeeId, title: 'WTU / ICE 204 / Gleis 12', reference_number: 'REF-2026-001', status: 'planned' },
];
const routeByAction: Record<string, string> = {
  gasfahrt_start: workEventRoutes.gasfahrtStart,
  gasfahrt_stop: workEventRoutes.gasfahrtStop,
  dienstbeginn: workEventRoutes.dienstbeginn,
  arbeit_stop: workEventRoutes.arbeitStop,
  dienstfahrt_start: workEventRoutes.dienstfahrtStart,
  dienstfahrt_stop: workEventRoutes.dienstfahrtStop,
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function timeNow() {
  return new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' }).format(new Date());
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
  const [bemerkung, setBemerkung] = useState('');
  const [message, setMessage] = useState('Bereit.');
  const [saving, setSaving] = useState(false);

  async function refreshState(orderId = selectedOrderId) {
    try {
      const state = await getFieldState(employeeId, orderId);
      setFieldState(state);
      return state;
    } catch (error) {
      setFieldState(null);
      setMessage('Field State API nicht erreichbar.');
      return null;
    }
  }

  useEffect(() => {
    getWorkOrders(employeeId)
      .then((response) => {
        if (response.data.length > 0) setOrders(response.data);
      })
      .catch(() => setMessage('API nicht erreichbar. Fallback-Auftrag aktiv.'));
    refreshState(1);
  }, []);

  const currentAction = fieldState?.allowed_actions?.[0] || 'gasfahrt_start';
  const currentLabel = fieldState?.next_button || 'Gasfahrt';
  const realLeistungsart = leistungsart === '' ? leistungsartCustom.trim() : leistungsart;
  const plannedExceeded = Boolean(fieldState?.planned_exceeded);
  const stopBlocked = Boolean(fieldState?.requires_bemerkung) && bemerkung.trim() === '';
  const dienstbeginnBlocked = currentLabel === 'Dienstbeginn' && (!date || !realLeistungsart || !referenznummer.trim() || !zugnummer.trim() || !einsatzort.trim());
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
      setMessage('Stop ist blockiert: geplante Zeit überschritten, Bemerkung ist Pflicht.');
      return;
    }

    if (dienstbeginnBlocked) {
      setMessage('Dienstbeginn ist blockiert: Datum, Leistungsart, Referenznummer, Zugnummer und Einsatzort sind Pflicht.');
      return;
    }

    const route = routeByAction[currentAction];
    if (!route) {
      setMessage('Keine API Route für nächste Aktion gefunden.');
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
          action_label: currentLabel,
          date,
          leistungsart: realLeistungsart,
          referenznummer,
          zugnummer,
          einsatzort,
          planned_start: plannedStart,
          planned_stop: plannedStop,
          client_time: timeNow(),
        },
      });
      setLog((items) => [...items, `${timeNow()} — ${currentLabel} gespeichert in API`]);
      setMessage(`${currentLabel} gespeichert.`);
      await refreshState(selectedOrderId);
    } catch (error) {
      const state = await refreshState(selectedOrderId);
      setLog((items) => [...items, `${timeNow()} — ${currentLabel} nicht gespeichert`]);
      setMessage(state ? `Aktion abgelehnt. Nächste erlaubte Aktion: ${state.next_button}.` : 'Aktion nicht gespeichert. API oder Field State nicht erreichbar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Demo</p>
          <h1>Button Flow</h1>
          <p className="hero-text">Gasfahrt, Dienstbeginn, Stop und Dienstfahrt nach Kundenanforderung.</p>
        </div>
        <div className="status-pill">{fieldState?.current_state || 'loading'}</div>
      </section>

      <section className="grid">
        <div className="panel action-panel">
          <button className="action-button primary" onClick={next} type="button" disabled={disabled}>{saving ? 'Speichern...' : currentLabel}</button>
          <p className="hint">Allowed action: {currentAction}</p>
          <p className="hint">Last event: {fieldState?.last_event_type || 'none'}</p>
          <p className="hint">Planned end: {fieldState?.planned_end_at || plannedStop}</p>
          <p className="hint">{message}</p>
          {currentLabel === 'Stop' ? <p className="hint">Backend planned exceeded: {plannedExceeded ? 'Ja' : 'Nein'}.</p> : null}
        </div>

        <div className="panel">
          <h2>Auftragsdaten</h2>
          <div className="form-grid">
            <label>Auftrag<select value={selectedOrderId} onChange={(event) => selectOrder(Number(event.target.value))}>{orders.map((order) => <option key={order.id} value={order.id}>{order.reference_number || `#${order.id}`} — {order.title}</option>)}</select></label>
            <label>Datum<input value={date} onChange={(event) => setDate(event.target.value)} type="date" /></label>
            <label>Leistungsart<select value={leistungsart} onChange={(event) => setLeistungsart(event.target.value)}>{leistungsartOptions.map((item) => <option key={item} value={item}>{item === '' ? 'Eigene Eingabe' : item}</option>)}</select></label>
            {leistungsart === '' ? <label>Eigene Leistungsart<input value={leistungsartCustom} onChange={(event) => setLeistungsartCustom(event.target.value)} placeholder="Leistungsart eingeben" /></label> : null}
            <label>Referenznummer<input value={referenznummer} onChange={(event) => setReferenznummer(event.target.value)} /></label>
            <label>Zugnummer<input value={zugnummer} onChange={(event) => setZugnummer(event.target.value)} /></label>
            <label>Einsatzort<input value={einsatzort} onChange={(event) => setEinsatzort(event.target.value)} /></label>
            <label>Geplanter Start<input value={plannedStart} onChange={(event) => setPlannedStart(event.target.value)} type="time" /></label>
            <label>Geplanter Stop<input value={plannedStop} onChange={(event) => setPlannedStop(event.target.value)} type="time" /></label>
            <label className="wide-field">Bemerkung<textarea value={bemerkung} onChange={(event) => setBemerkung(event.target.value)} placeholder="Pflicht, wenn Zeit überschritten ist" /></label>
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>Log</h2>
        {log.length === 0 ? <p className="hint">No actions yet.</p> : null}
        {log.map((item, index) => <p key={`${item}-${index}`}>{index + 1}. {item}</p>)}
      </section>
    </main>
  );
}
