'use client';

import { useEffect, useState } from 'react';
import { postWorkEvent } from '../../lib/api';
import { workflowSteps } from '../../lib/workflow';
import { getWorkOrders, type WorkOrder } from '../../lib/work-orders';

const leistungsartOptions = ['', 'WTU', 'WSU', 'E-WU', 'Rb', 'Azf', 'RID-Kontrolle', 'Zugbeschtreifung'];
const fallbackOrders = [
  { id: 1, title: 'WTU / ICE 204 / Gleis 12', reference_number: 'REF-2026-001', status: 'planned' },
];

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
  return {
    leistungsart: parts[0] || 'WTU',
    zugnummer: parts[1] || '',
    einsatzort: parts[2] || '',
  };
}

export default function DemoPage() {
  const [step, setStep] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [orders, setOrders] = useState<WorkOrder[]>(fallbackOrders);
  const [selectedOrderId, setSelectedOrderId] = useState(1);
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

  useEffect(() => {
    getWorkOrders()
      .then((response) => {
        if (response.data.length > 0) setOrders(response.data);
      })
      .catch(() => setMessage('API nicht erreichbar. Fallback-Auftrag aktiv.'));
  }, []);

  const current = workflowSteps[step] || workflowSteps[workflowSteps.length - 1];
  const realLeistungsart = leistungsart === '' ? leistungsartCustom.trim() : leistungsart;
  const plannedExceeded = current.label === 'Stop' && plannedStop !== '' && timeNow() > plannedStop;
  const stopBlocked = current.label === 'Stop' && plannedExceeded && bemerkung.trim() === '';
  const dienstbeginnBlocked = current.label === 'Dienstbeginn' && (!date || !realLeistungsart || !referenznummer.trim() || !zugnummer.trim() || !einsatzort.trim());
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

    setSaving(true);
    const position = await getPosition();

    try {
      await postWorkEvent(current.route, {
        employee_id: 1,
        assignment_id: selectedOrderId,
        ...position,
        planned_exceeded: plannedExceeded,
        bemerkung,
        payload: {
          source: 'demo',
          action_label: current.label,
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
      setLog((items) => [...items, `${timeNow()} — ${current.label} gespeichert in API`]);
      setMessage(`${current.label} gespeichert.`);
    } catch (error) {
      setLog((items) => [...items, `${timeNow()} — ${current.label} lokal protokolliert`]);
      setMessage('API nicht erreichbar. Aktion lokal im Demo protokolliert.');
    } finally {
      setStep((value) => Math.min(value + 1, workflowSteps.length - 1));
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
        <div className="status-pill">Next: {current.label}</div>
      </section>

      <section className="grid">
        <div className="panel action-panel">
          <button className="action-button primary" onClick={next} type="button" disabled={disabled}>{saving ? 'Speichern...' : current.label}</button>
          <p className="hint">{message}</p>
          {current.label === 'Stop' ? <p className="hint">Geplante Stopzeit: {plannedStop}. Aktuell: {timeNow()}. Überschritten: {plannedExceeded ? 'Ja' : 'Nein'}.</p> : null}
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
