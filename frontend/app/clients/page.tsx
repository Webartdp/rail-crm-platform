const clients = [
  ['DB Service GmbH', 'Berlin', '12 objects'],
  ['Rail Control Süd', 'München', '7 objects'],
  ['Nordbahn Partner', 'Hamburg', '5 objects'],
];

export default function ClientsPage() {
  return (
    <main className="page-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">CRM</p>
          <h1>Clients</h1>
          <p className="hero-text">Customer companies connected to objects and assignments.</p>
        </div>
        <div className="status-pill">CRM core</div>
      </section>

      <section className="panel">
        <div className="table-row"><strong>Client</strong><strong>City</strong><strong>Objects</strong></div>
        {clients.map(([name, city, objects]) => (
          <div className="table-row" key={name}>
            <span>{name}</span>
            <span>{city}</span>
            <span>{objects}</span>
          </div>
        ))}
      </section>
    </main>
  );
}
