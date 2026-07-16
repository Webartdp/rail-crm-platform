import RoleGuard from '../components/RoleGuard';

const cards = [
  ['/employees', 'Employees', '24 active'],
  ['/assignments', 'Assignments', '8 today'],
  ['/approvals', 'Open approvals', '5 pending'],
  ['/demo', 'Work events', 'Workflow demo'],
];

export default function AdminPage() {
  return (
    <main className="page-shell">
      <RoleGuard allowedRoles={['admin']} title="Admin dashboard access">
        <section className="hero-card">
          <div>
            <p className="eyebrow">Management</p>
            <h1>Dashboard</h1>
            <p className="hero-text">First management overview prototype.</p>
          </div>
          <div className="status-pill">Today</div>
        </section>

        <section className="stats-grid">
          {cards.map(([href, title, value]) => (
            <a className="panel stat-card nav-card" href={href} key={href}>
              <p className="eyebrow">{title}</p>
              <h2>{value}</h2>
            </a>
          ))}
        </section>

        <section className="panel">
          <h2>Approval Queue</h2>
          <div className="table-row"><strong>Employee</strong><strong>Object</strong><strong>Status</strong></div>
          <div className="table-row"><span>Max Müller</span><span>Gleis 12</span><span>Waiting</span></div>
          <div className="table-row"><span>Anna Schmidt</span><span>Bahnhof Nord</span><span>Correction requested</span></div>
        </section>
      </RoleGuard>
    </main>
  );
}
