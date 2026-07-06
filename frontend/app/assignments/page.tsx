const assignments = [
  ['REF-2026-001', 'WTU', 'ICE 204', 'Gleis 12', 'Planned'],
  ['REF-2026-002', 'WSU', 'RE 88', 'Bahnhof Nord', 'In progress'],
  ['REF-2026-003', 'RID-Kontrolle', 'Cargo 17', 'Depot West', 'Waiting'],
];

export default function AssignmentsPage() {
  return (
    <main className="page-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Assignments</p>
          <h1>Assignments</h1>
          <p className="hero-text">Planned work orders with Leistungsart, Zugnummer and Einsatzort.</p>
        </div>
        <div className="status-pill">Today</div>
      </section>

      <section className="panel">
        <div className="table-row"><strong>Reference</strong><strong>Work</strong><strong>Status</strong></div>
        {assignments.map(([ref, type, train, place, status]) => (
          <div className="table-row" key={ref}>
            <span>{ref}</span>
            <span>{type} / {train} / {place}</span>
            <span>{status}</span>
          </div>
        ))}
      </section>
    </main>
  );
}
