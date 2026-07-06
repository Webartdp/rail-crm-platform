export default function EmployeePage() {
  return (
    <main className="page-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Employee</p>
          <h1>My Work Day</h1>
          <p className="hero-text">Employee mobile-first workspace for assignments and field actions.</p>
        </div>
        <div className="status-pill">Assigned</div>
      </section>

      <section className="grid">
        <div className="panel action-panel">
          <h2>Current Assignment</h2>
          <p><strong>Leistungsart:</strong> WTU</p>
          <p><strong>Referenznummer:</strong> REF-2026-001</p>
          <p><strong>Zugnummer:</strong> ICE 204</p>
          <p><strong>Einsatzort:</strong> Gleis 12</p>
          <a className="action-link" href="/demo">Open workflow demo</a>
        </div>

        <div className="panel">
          <h2>Today</h2>
          <div className="timeline-item done"><strong>06:40</strong><div><p>Gasfahrt</p><span>Ready for live tracking integration</span></div></div>
          <div className="timeline-item pending"><strong>--:--</strong><div><p>Dienstbeginn</p><span>Waiting for employee action</span></div></div>
        </div>
      </section>
    </main>
  );
}
