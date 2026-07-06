'use client';

import { useState } from 'react';

const steps = ['Gasfahrt', 'Gasfahrt beendet', 'Dienstbeginn', 'Stop', 'Start Dienstfahrt', 'Stop Dienstfahrt'];

export default function DemoPage() {
  const [step, setStep] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const current = steps[step] || steps[steps.length - 1];

  function next() {
    setLog((items) => [...items, current]);
    setStep((value) => Math.min(value + 1, steps.length - 1));
  }

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Demo</p>
          <h1>Button Flow</h1>
          <p className="hero-text">Simple interactive test for employee workflow buttons.</p>
        </div>
        <div className="status-pill">Next: {current}</div>
      </section>

      <section className="panel action-panel">
        <button className="action-button primary" onClick={next} type="button">{current}</button>
        <h2>Log</h2>
        {log.length === 0 ? <p className="hint">No actions yet.</p> : null}
        {log.map((item, index) => <p key={`${item}-${index}`}>{index + 1}. {item}</p>)}
      </section>
    </main>
  );
}
