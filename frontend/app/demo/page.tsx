'use client';

import { useState } from 'react';

const steps = ['Gasfahrt', 'Gasfahrt beendet', 'Dienstbeginn', 'Stop', 'Start Dienstfahrt', 'Stop Dienstfahrt'];

export default function DemoPage() {
  const [step, setStep] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [plannedExceeded, setPlannedExceeded] = useState(false);
  const [bemerkung, setBemerkung] = useState('');
  const [message, setMessage] = useState('Bereit.');
  const current = steps[step] || steps[steps.length - 1];
  const stopBlocked = current === 'Stop' && plannedExceeded && bemerkung.trim() === '';

  function next() {
    if (stopBlocked) {
      setMessage('Stop ist blockiert: Bemerkung ist Pflicht.');
      return;
    }

    setLog((items) => [...items, current]);
    setStep((value) => Math.min(value + 1, steps.length - 1));
    setMessage(`${current} gespeichert.`);
  }

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Demo</p>
          <h1>Button Flow</h1>
          <p className="hero-text">Interaktiver Test für Gasfahrt, Dienstbeginn, Stop und Dienstfahrt.</p>
        </div>
        <div className="status-pill">Next: {current}</div>
      </section>

      <section className="grid">
        <div className="panel action-panel">
          <button className="action-button primary" onClick={next} type="button" disabled={stopBlocked}>
            {current}
          </button>
          <p className="hint">{message}</p>
        </div>

        <div className="panel">
          <h2>Stop-Regel</h2>
          <label>
            Geplante Zeit überschritten?
            <select value={plannedExceeded ? 'yes' : 'no'} onChange={(event) => setPlannedExceeded(event.target.value === 'yes')}>
              <option value="no">Nein</option>
              <option value="yes">Ja</option>
            </select>
          </label>
          <label>
            Bemerkung
            <textarea value={bemerkung} onChange={(event) => setBemerkung(event.target.value)} placeholder="Pflicht, wenn Zeit überschritten ist" />
          </label>
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
