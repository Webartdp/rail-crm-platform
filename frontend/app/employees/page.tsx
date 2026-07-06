const employees = [
  ['Max Müller', 'Assigned', 'Gleis 12', 'WTU'],
  ['Anna Schmidt', 'Travelling', 'Bahnhof Nord', 'WSU'],
  ['Ivan Petrenko', 'Waiting approval', 'Depot West', 'Rb'],
];

export default function EmployeesPage() {
  return (
    <main className="page-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Employees</p>
          <h1>Employees</h1>
          <p className="hero-text">First employee list prototype with current field status.</p>
        </div>
        <div className="status-pill">3 demo employees</div>
      </section>

      <section className="panel">
        <div className="table-row"><strong>Name</strong><strong>Status</strong><strong>Object</strong></div>
        {employees.map(([name, status, place, type]) => (
          <div className="table-row" key={name}>
            <span>{name}</span>
            <span>{status}</span>
            <span>{place} / {type}</span>
          </div>
        ))}
      </section>
    </main>
  );
}
