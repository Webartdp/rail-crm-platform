const cards = [
  ['Employees', '24 active'],
  ['Assignments', '8 today'],
  ['Open approvals', '5 pending'],
  ['Work events', '37 logged'],
];

export default function AdminPage() {
  return (
    <main className="page-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Management</p>
          <h1>Dashboard</h1>
          <p className="hero-text">First management overview prototype.</p>
        </div>
        <div className="status-pill">Today</div>
      </section>

      <section className="stats-grid">
        {cards.map(([title, value]) => (
          <div className="panel stat-card" key={title}>
            <p className="eyebrow">{title}</p>
            <h2>{value}</h2>
          </div>
        ))}
      </section>

      <section className="panel">
        <h2>Approval Queue</h2>
        <div className="table-row"><strong>Employee</strong><strong>Object</strong><strong>Status</strong></div>
        <div className="table-row"><span>Max Müller</span><span>Gleis 12</span><span>Waiting</span></div>
        <div className="table-row"><span>Anna Schmidt</span><span>Bahnhof Nord</span><span>Correction requested</span></div>
      </section>
    </main>
  );
}
