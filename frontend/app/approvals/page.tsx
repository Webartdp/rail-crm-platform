const approvals = [
  ['Max Müller', 'REF-2026-001', '08:00 - 16:45', 'Bemerkung required'],
  ['Anna Schmidt', 'REF-2026-002', '07:10 - 14:55', 'Ready'],
  ['Ivan Petrenko', 'REF-2026-003', '09:00 - 18:20', 'Overplanned'],
];

export default function ApprovalsPage() {
  return (
    <main className="page-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Approvals</p>
          <h1>Approval Queue</h1>
          <p className="hero-text">Coordinator and manager review for employee time data.</p>
        </div>
        <div className="status-pill">3 pending</div>
      </section>

      <section className="panel">
        <div className="table-row"><strong>Employee</strong><strong>Time</strong><strong>Status</strong></div>
        {approvals.map(([name, ref, time, status]) => (
          <div className="table-row" key={ref}>
            <span>{name}</span>
            <span>{ref} / {time}</span>
            <span>{status}</span>
          </div>
        ))}
      </section>
    </main>
  );
}
